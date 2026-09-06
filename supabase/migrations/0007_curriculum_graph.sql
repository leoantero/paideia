-- ============================================================================
-- Camada 1 do Learning Graph: o currículo como DAG de conceitos.
-- Ver docs/LEARNING_GRAPH.md.
--
-- Dado de referência, nao dado de aluno: sem PII aqui. Por isso a leitura e
-- liberada para qualquer usuario autenticado e a escrita e so por service_role
-- (seed/admin) -- nao existe policy de insert para 'authenticated' de proposito.
-- ============================================================================

-- Versao do curriculo. Rede diferente usa material diferente, e BNCC muda.
-- Sem isso voce nao consegue evoluir o grafo sem invalidar historico antigo.
create table curriculum_versions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- ex: 'bncc-2018-v1'
  label text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- A unidade atomica de "coisa que se aprende".
-- `code` ancora na BNCC quando existir (ex 'EF08MA06') -- e o vocabulario que
-- a coordenacao pedagogica ja fala e o que permite mapear pro material da rede.
create table concepts (
  id uuid primary key default gen_random_uuid(),
  curriculum_version_id uuid not null references curriculum_versions(id) on delete cascade,
  code text not null,                     -- 'EF08MA06' ou codigo interno
  name text not null,
  subject text not null,                  -- 'math' | 'science' | 'language' | 'history'
  grade_band grade_band not null,
  grade_year smallint,                    -- 1..12, mais granular que grade_band
  description text,
  -- dificuldade intrinseca do conceito (0..1). Alimenta o prior do BKT.
  intrinsic_difficulty real not null default 0.5
    check (intrinsic_difficulty >= 0 and intrinsic_difficulty <= 1),
  created_at timestamptz not null default now(),
  unique (curriculum_version_id, code)
);

create index concepts_lookup_idx
  on concepts (curriculum_version_id, subject, grade_band);

-- A aresta do DAG. E o que permite diagnostico causal em vez de dashboard:
-- "travou em funcao afim" -> na verdade travou em fracao, duas series atras.
create table concept_prerequisites (
  concept_id uuid not null references concepts(id) on delete cascade,
  prerequisite_id uuid not null references concepts(id) on delete cascade,
  -- quao forte e a dependencia (0..1). Nem todo pre-requisito bloqueia igual.
  strength real not null default 1.0 check (strength > 0 and strength <= 1),
  primary key (concept_id, prerequisite_id),
  -- ciclo trivial barrado aqui; ciclo longo e barrado no seed (ver script)
  check (concept_id <> prerequisite_id)
);

create index concept_prereq_reverse_idx
  on concept_prerequisites (prerequisite_id);

alter table curriculum_versions enable row level security;
alter table concepts enable row level security;
alter table concept_prerequisites enable row level security;

create policy curriculum_versions_read on curriculum_versions
  for select to authenticated using (true);
create policy concepts_read on concepts
  for select to authenticated using (true);
create policy concept_prerequisites_read on concept_prerequisites
  for select to authenticated using (true);

-- ============================================================================
-- Fecho transitivo de pre-requisitos, com decaimento de forca por profundidade.
-- Usado pelo diagnostico ("qual e a raiz da dificuldade?") e pelo prompt
-- socratico (quais bases estao fracas).
-- ============================================================================
create function concept_prerequisite_closure(p_concept_id uuid, p_max_depth int default 4)
returns table (prerequisite_id uuid, depth int, cumulative_strength real)
language sql
stable
as $$
  with recursive walk as (
    select cp.prerequisite_id, 1 as depth, cp.strength as cumulative_strength
    from concept_prerequisites cp
    where cp.concept_id = p_concept_id

    union all

    select cp.prerequisite_id, w.depth + 1, (w.cumulative_strength * cp.strength)::real
    from concept_prerequisites cp
    join walk w on cp.concept_id = w.prerequisite_id
    where w.depth < p_max_depth
  )
  select prerequisite_id, min(depth) as depth, max(cumulative_strength) as cumulative_strength
  from walk
  group by prerequisite_id;
$$;

grant execute on function concept_prerequisite_closure(uuid, int) to authenticated;
