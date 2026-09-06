-- ============================================================================
-- Camadas 2 e 3 do Learning Graph. Ver docs/LEARNING_GRAPH.md.
--
-- learning_events e o ATIVO: append-only, imutavel, nunca sofre update.
-- concept_mastery e DERIVADO: 100% recomputavel a partir dos eventos. Se o
-- modelo de inferencia melhorar, voce reprocessa o historico inteiro e o
-- produto fica melhor retroativamente. Nao quebre essa propriedade.
-- ============================================================================

create type evidence_source as enum (
  'tutor_turn',          -- turno do chat socratico (ruidoso, confidence baixa)
  'retrieval_review',    -- revisao espacada (sinal limpo)
  'assessment_item',     -- item de avaliacao (sinal mais limpo que existe)
  'teacher_observation'  -- professor marcou na mao
);

create type evidence_signal as enum (
  'correct',
  'partial',
  'incorrect',
  'struggling',   -- travou, pediu ajuda, abandonou
  'insight'       -- chegou sozinho na conclusao -- o sinal mais forte que existe
);

-- ============================================================================
-- [2] EVIDENCIA -- append-only
-- ============================================================================
create table learning_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  concept_id uuid not null references concepts(id),
  source evidence_source not null,
  signal evidence_signal not null,
  -- o quanto confiamos que essa evidencia e real. Chat e ruidoso (~0.3-0.6),
  -- item de prova e limpo (~0.95). O modelo de dominio PRECISA pesar por isso.
  confidence real not null default 0.5 check (confidence > 0 and confidence <= 1),
  -- dificuldade do que foi tentado. Sem isso o modelo nao distingue acertar
  -- o facil de acertar o dificil.
  difficulty real check (difficulty >= 0 and difficulty <= 1),
  -- rastreabilidade ate a origem (message_id, item_id, etc). Sem FK de
  -- proposito: a origem pode ser apagada por retencao sem matar a evidencia.
  source_ref uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index learning_events_student_concept_idx
  on learning_events (student_id, concept_id, occurred_at desc);
create index learning_events_student_time_idx
  on learning_events (student_id, occurred_at desc);
create index learning_events_concept_idx
  on learning_events (concept_id, occurred_at desc);

alter table learning_events enable row level security;

-- O aluno le a propria evidencia. O PAI NAO LE. Isso e deliberado e espelha o
-- que 0004 ja faz com conversations: pai ve derivado (dominio, tendencia),
-- nunca o evento cru -- que e quase tao revelador quanto a transcricao.
-- Sem policy de insert/update/delete: o unico escritor e a RPC abaixo, e nada
-- nunca faz update. Imutabilidade e reforcada pelo trigger.
create policy learning_events_select_self on learning_events
  for select using (auth.uid() = student_id);

create function reject_learning_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'learning_events e append-only (tentativa de % )', tg_op;
end;
$$;

create trigger learning_events_immutable
  before update or delete on learning_events
  for each row execute function reject_learning_event_mutation();

-- ============================================================================
-- [3] ESTADO INFERIDO -- derivado, recomputavel
-- ============================================================================
create table concept_mastery (
  student_id uuid not null references students(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  -- posterior do BKT: P(aluno domina o conceito). Ver bkt.ts.
  mastery real not null default 0.15 check (mastery >= 0 and mastery <= 1),
  -- quanta evidencia sustenta esse numero. mastery=0.9 com confidence=0.1
  -- nao pode virar afirmacao no dashboard do professor.
  confidence real not null default 0 check (confidence >= 0 and confidence <= 1),
  evidence_count integer not null default 0,
  last_evidence_at timestamptz,
  -- repeticao espacada sai do MESMO posterior: diagnostico e agenda de revisao
  -- sao a mesma inferencia, nao duas features.
  next_review_at timestamptz,
  review_interval_days real not null default 1,
  -- versao do modelo que produziu esse numero. Permite recomputar so o que
  -- ficou pra tras quando o modelo mudar.
  model_version text not null default 'bkt-v1',
  updated_at timestamptz not null default now(),
  primary key (student_id, concept_id)
);

create index concept_mastery_review_idx
  on concept_mastery (student_id, next_review_at)
  where next_review_at is not null;
create index concept_mastery_weak_idx
  on concept_mastery (student_id, mastery);

alter table concept_mastery enable row level security;

-- Aqui SIM o pai le: e o derivado, e e exatamente o produto que ele compra.
create policy concept_mastery_select_self_or_parent on concept_mastery
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from parent_student_links l
      where l.student_id = concept_mastery.student_id
        and l.parent_id = auth.uid()
        and l.status = 'active'
    )
  );

-- ============================================================================
-- record_learning_events(): unico escritor de learning_events.
-- Substitui record_tutoring_session() (0006), que so contava sessao.
--
-- Escreve SEMPRE contra auth.uid() -- mesmo sendo security definer, nao da
-- pra forjar evidencia de outro aluno.
--
-- Recebe um array json pra que um turno de chat que toca 3 conceitos vire
-- 1 roundtrip, nao 3.
-- ============================================================================
create function record_learning_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into learning_events
    (student_id, concept_id, source, signal, confidence, difficulty, source_ref, metadata)
  select
    auth.uid(),
    (e ->> 'concept_id')::uuid,
    (e ->> 'source')::evidence_source,
    (e ->> 'signal')::evidence_signal,
    coalesce((e ->> 'confidence')::real, 0.5),
    (e ->> 'difficulty')::real,
    (e ->> 'source_ref')::uuid,
    coalesce(e -> 'metadata', '{}'::jsonb)
  from jsonb_array_elements(p_events) as e;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function record_learning_events(jsonb) to authenticated;

-- ============================================================================
-- upsert_concept_mastery(): escreve o estado inferido.
-- A INFERENCIA em si (BKT) vive em src/features/learning-graph/bkt.ts, nao
-- aqui -- e logica que precisa de teste unitario e vai mudar muito. O banco
-- so persiste o resultado.
-- ============================================================================
create function upsert_concept_mastery(
  p_concept_id uuid,
  p_mastery real,
  p_confidence real,
  p_next_review_at timestamptz,
  p_review_interval_days real,
  p_model_version text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into concept_mastery (
    student_id, concept_id, mastery, confidence, evidence_count,
    last_evidence_at, next_review_at, review_interval_days, model_version, updated_at
  )
  values (
    auth.uid(), p_concept_id, p_mastery, p_confidence, 1,
    now(), p_next_review_at, p_review_interval_days, p_model_version, now()
  )
  on conflict (student_id, concept_id) do update set
    mastery = excluded.mastery,
    confidence = excluded.confidence,
    evidence_count = concept_mastery.evidence_count + 1,
    last_evidence_at = now(),
    next_review_at = excluded.next_review_at,
    review_interval_days = excluded.review_interval_days,
    model_version = excluded.model_version,
    updated_at = now();
end;
$$;

grant execute on function upsert_concept_mastery(uuid, real, real, timestamptz, real, text) to authenticated;

-- ============================================================================
-- diagnose_weak_prerequisites(): a query que vende o contrato.
-- Dado um conceito em que o aluno esta travando, sobe o DAG e devolve os
-- pre-requisitos fracos ordenados por quanto explicam o travamento.
-- ============================================================================
create function diagnose_weak_prerequisites(p_student_id uuid, p_concept_id uuid)
returns table (
  concept_id uuid,
  concept_code text,
  concept_name text,
  depth int,
  mastery real,
  blocking_score real
)
language sql
stable
as $$
  select
    c.id,
    c.code,
    c.name,
    cl.depth,
    coalesce(cm.mastery, 0.15)::real,
    (cl.cumulative_strength * (1 - coalesce(cm.mastery, 0.15)))::real as blocking_score
  from concept_prerequisite_closure(p_concept_id) cl
  join concepts c on c.id = cl.prerequisite_id
  left join concept_mastery cm
    on cm.concept_id = c.id and cm.student_id = p_student_id
  where coalesce(cm.mastery, 0.15) < 0.6
  order by blocking_score desc;
$$;

grant execute on function diagnose_weak_prerequisites(uuid, uuid) to authenticated;
