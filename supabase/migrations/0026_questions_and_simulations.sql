-- ============================================================================
-- Questões de provas públicas (ENEM, SAEB, OBMEP) e simulações interativas.
--
-- Questões: o aluno resolve itens reais filtrados pela série da matrícula.
-- O gabarito NUNCA sai para o cliente antes da hora: não existe policy de
-- select em public_questions — a leitura é só pelas RPCs abaixo, que omitem
-- `correct_letter` (diferente de `cards`, 0021, onde a policy de select expõe
-- `correct_choice`). Correção e recompensa acontecem no servidor; a evidência
-- `assessment_item` é gravada pela rota em after() (evidence-recorder.ts).
--
-- Tentativas são só do aluno: responsável e professor veem domínio por
-- conceito (concept_mastery), nunca "errou a questão X" (docs/PEDAGOGY.md).
--
-- Simulações: o catálogo vive no código (src/features/simulations); aqui só
-- fica a conclusão, para recompensar uma vez por simulação.
-- ============================================================================

create type question_origin as enum ('enem', 'saeb', 'obmep', 'obmep_mirim');

-- Uma origem só é servida depois da checagem de licença (o produto é
-- comercial e o ENEM traz textos e charges de terceiros). Liga-se por
-- service-role: `update question_origin_settings set enabled = true ...`.
create table question_origin_settings (
  origin question_origin primary key,
  enabled boolean not null default false
);

insert into question_origin_settings (origin)
values ('enem'), ('saeb'), ('obmep'), ('obmep_mirim');

alter table question_origin_settings enable row level security;

create table public_questions (
  id uuid primary key default gen_random_uuid(),
  origin question_origin not null,
  exam_year smallint not null,
  exam_label text not null,
  item_number integer not null,
  area text not null check (area in ('matematica', 'natureza', 'linguagens', 'humanas')),
  subject text not null,
  -- Âncora no learning graph. Nulo só enquanto o etiquetador não decidiu:
  -- questão sem conceito não é servida (evidência sem âncora é dado perdido).
  concept_id uuid references concepts(id) on delete set null,
  grade_year smallint check (grade_year between 1 and 12),
  difficulty real not null default 0.5 check (difficulty between 0 and 1),
  -- [{type:'text', text} | {type:'image', path, alt, width, height}]
  stem jsonb not null check (jsonb_typeof(stem) = 'array' and jsonb_array_length(stem) > 0),
  -- [{letter:'A', text?, image?}]
  alternatives jsonb not null check (
    jsonb_typeof(alternatives) = 'array' and jsonb_array_length(alternatives) between 2 and 5
  ),
  correct_letter char(1) not null check (correct_letter in ('A', 'B', 'C', 'D', 'E')),
  -- {url, license, attribution}
  source jsonb not null default '{}',
  review_status content_review_status not null default 'pending_review',
  -- {model, confidence, notes} do etiquetador
  tagging jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (origin, exam_year, exam_label, item_number)
);

create index public_questions_serving_idx
  on public_questions (area, grade_year)
  where review_status = 'approved' and concept_id is not null;
create index public_questions_concept_idx on public_questions (concept_id);

alter table public_questions enable row level security;

create table question_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  question_id uuid not null references public_questions(id) on delete cascade,
  chosen_letter char(1) not null check (chosen_letter in ('A', 'B', 'C', 'D', 'E')),
  correct boolean not null,
  first_attempt boolean not null,
  duration_ms integer not null default 0 check (duration_ms between 0 and 1800000),
  revealed_at timestamptz,
  created_at timestamptz not null default app_now()
);

create index question_attempts_student_idx on question_attempts (student_id, question_id);
create index question_attempts_student_time_idx on question_attempts (student_id, created_at);

alter table question_attempts enable row level security;

create policy question_attempts_select_own on question_attempts
  for select using (auth.uid() = student_id);

create table simulation_completions (
  student_id uuid not null references students(id) on delete cascade,
  simulation_id text not null check (simulation_id ~ '^[a-z0-9-]{1,64}$'),
  completed_at timestamptz not null default app_now(),
  primary key (student_id, simulation_id)
);

alter table simulation_completions enable row level security;

create policy simulation_completions_select_own on simulation_completions
  for select using (auth.uid() = student_id);

-- Contexto de uma conversa do tutor aberta a partir de uma questão ou de uma
-- simulação. A rota valida a posse da tentativa; isto só registra a origem.
alter table conversations
  add column question_attempt_id uuid references question_attempts(id) on delete set null,
  add column simulation_id text check (simulation_id ~ '^[a-z0-9-]{1,64}$');

alter type reward_source add value if not exists 'question_answer';
alter type reward_source add value if not exists 'simulation';

-- Imagens das provas: copiadas para o nosso Storage na importação (sem
-- hotlink — o IP do aluno não vai para terceiros). O bloco é condicional
-- porque o Postgres de teste (PGlite) não tem o schema storage.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('question-media', 'question-media', true)
    on conflict (id) do nothing;
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- Série do aluno: a da turma ativa (matrícula); sem turma, cai para o
-- segmento declarado. Fundamental I → 5º, II → 9º, Médio → 3ª série (12).
-- ----------------------------------------------------------------------------
create function student_grade_year(p_student uuid) returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select sc.grade_year from school_classes sc where sc.id = current_class_id(p_student)),
    (select case s.grade_level
              when 'elementary_1' then 5
              when 'elementary_2' then 9
              when 'high_school' then 12
            end::smallint
       from students s where s.id = p_student)
  )
$$;

revoke execute on function student_grade_year(uuid) from public, anon, authenticated;

-- Janela de séries servida: a série do aluno e até 3 anteriores (revisão de
-- base). No Médio, todo item até a 3ª série vale (o ENEM cobra o EM inteiro).
-- Sem série conhecida, tudo vale.
create function question_fits_grade(p_question_grade smallint, p_student_grade smallint)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_student_grade is null
      or p_question_grade is null
      or (
        p_question_grade >= p_student_grade - 3
        and p_question_grade <= case when p_student_grade >= 10 then 12 else p_student_grade end
      )
$$;

-- Questões que o aluno pode receber agora.
create function servable_questions(p_student uuid)
returns setof public_questions
language sql
stable
security definer
set search_path = public
as $$
  select q.*
  from public_questions q
  join question_origin_settings o on o.origin = q.origin and o.enabled
  where q.review_status = 'approved'
    and q.concept_id is not null
    and question_fits_grade(q.grade_year, student_grade_year(p_student))
$$;

revoke execute on function servable_questions(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Lista "Por conteúdo": por conceito, quantas questões existem para a série,
-- quantas o aluno já fez e o % de acerto na primeira tentativa.
-- ----------------------------------------------------------------------------
create function get_question_overview(p_area text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_result json;
begin
  if not exists (select 1 from students where id = v_student) then
    raise exception 'Only students can see questions.';
  end if;

  with servable as (
    select * from servable_questions(v_student)
  ),
  per_area as (
    select a.area, count(s.id) as total
    from (values ('matematica'), ('natureza'), ('linguagens'), ('humanas')) a(area)
    left join servable s on s.area = a.area
    group by a.area
  ),
  firsts as (
    select qa.question_id, qa.correct
    from question_attempts qa
    where qa.student_id = v_student and qa.first_attempt
  ),
  per_concept as (
    select
      c.id as concept_id,
      c.code,
      c.name,
      c.subject,
      count(s.id) as total,
      count(f.question_id) as answered,
      case when count(f.question_id) = 0 then null
           else round(100.0 * count(f.question_id) filter (where f.correct) / count(f.question_id))
      end as accuracy
    from servable s
    join concepts c on c.id = s.concept_id
    left join firsts f on f.question_id = s.id
    where s.area = p_area
    group by c.id, c.code, c.name, c.subject
  )
  select json_build_object(
    'area', p_area,
    'areas', (select json_agg(json_build_object('area', area, 'total', total)) from per_area),
    'total', (select coalesce(sum(total), 0) from per_concept),
    'answered', (select coalesce(sum(answered), 0) from per_concept),
    'concepts', coalesce(
      (select json_agg(row_to_json(pc) order by pc.answered > 0 desc, pc.subject, pc.name) from per_concept pc),
      '[]'::json
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function get_question_overview(text) from public, anon;
grant execute on function get_question_overview(text) to authenticated;

-- ----------------------------------------------------------------------------
-- Sessão de questões. Nunca devolve o gabarito. Ordem: as que o aluno ainda
-- não fez, depois as de conceitos fracos (BKT < 0.6), depois sorteio.
-- ----------------------------------------------------------------------------
create function get_question_set(
  p_area text,
  p_concept_id uuid default null,
  p_limit integer default 10
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_result json;
begin
  if not exists (select 1 from students where id = v_student) then
    raise exception 'Only students can see questions.';
  end if;

  with picked as (
    select
      s.*,
      c.name as concept_name,
      exists (
        select 1 from question_attempts qa
        where qa.student_id = v_student and qa.question_id = s.id
      ) as answered_before,
      coalesce(cm.mastery, 0.5) as mastery
    from servable_questions(v_student) s
    join concepts c on c.id = s.concept_id
    left join concept_mastery cm on cm.student_id = v_student and cm.concept_id = s.concept_id
    where s.area = p_area
      and (p_concept_id is null or s.concept_id = p_concept_id)
    order by answered_before, (coalesce(cm.mastery, 0.5) < 0.6) desc, random()
    limit least(greatest(coalesce(p_limit, 10), 1), 20)
  )
  select coalesce(json_agg(json_build_object(
    'id', id,
    'origin', origin,
    'exam_label', exam_label,
    'exam_year', exam_year,
    'item_number', item_number,
    'area', area,
    'subject', subject,
    'concept_id', concept_id,
    'concept_name', concept_name,
    'stem', stem,
    'alternatives', alternatives,
    'source', source,
    'answered_before', answered_before
  )), '[]'::json)
  into v_result
  from picked;

  return v_result;
end;
$$;

revoke execute on function get_question_set(text, uuid, integer) from public, anon;
grant execute on function get_question_set(text, uuid, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- answer_question(): corrige no servidor e registra a tentativa.
-- O gabarito só volta se o aluno acertou; no erro, o tutor conversa primeiro
-- e a resposta só sai por reveal_question_answer().
-- Recompensa e evidência valem só na primeira tentativa da questão; teto
-- diário para que resolver em massa não vire fazenda de pontos.
-- ----------------------------------------------------------------------------
create function answer_question(
  p_question_id uuid,
  p_letter text,
  p_duration_ms integer default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c_daily_cap constant integer := 30;
  v_student uuid := auth.uid();
  v_question public_questions%rowtype;
  v_letter char(1) := upper(btrim(coalesce(p_letter, '')));
  v_correct boolean;
  v_first boolean;
  v_attempt_id uuid;
  v_points integer := 0;
  v_coins integer := 0;
  v_rewarded_today integer;
begin
  if not exists (select 1 from students where id = v_student) then
    raise exception 'Only students can answer questions.';
  end if;

  select * into v_question from servable_questions(v_student) where id = p_question_id;
  if not found then
    raise exception 'Question not available.';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(v_question.alternatives) a where a ->> 'letter' = v_letter
  ) then
    raise exception 'Invalid alternative.';
  end if;

  v_correct := v_letter = v_question.correct_letter;
  v_first := not exists (
    select 1 from question_attempts where student_id = v_student and question_id = p_question_id
  );

  insert into question_attempts (student_id, question_id, chosen_letter, correct, first_attempt, duration_ms)
  values (v_student, p_question_id, v_letter, v_correct, v_first,
          least(greatest(coalesce(p_duration_ms, 0), 0), 1800000))
  returning id into v_attempt_id;

  if v_first then
    select count(*) into v_rewarded_today
    from reward_events
    where student_id = v_student and source = 'question_answer'
      and created_at >= app_day_start(app_today());

    if v_rewarded_today < c_daily_cap then
      v_points := case when v_correct then 10 else 2 end;
      v_coins := case when v_correct then 2 else 0 end;
      perform award_reward(v_student, 'question_answer', v_points, v_coins, p_question_id::text);
    end if;
  end if;

  perform register_activity(v_student);

  return json_build_object(
    'attempt_id', v_attempt_id,
    'question_id', p_question_id,
    'origin', v_question.origin,
    'correct', v_correct,
    'correct_letter', case when v_correct then v_question.correct_letter end,
    'first_attempt', v_first,
    'points', v_points,
    'coins', v_coins,
    'concept_id', v_question.concept_id,
    'difficulty', v_question.difficulty
  );
end;
$$;

revoke execute on function answer_question(uuid, text, integer) from public, anon;
grant execute on function answer_question(uuid, text, integer) to authenticated;

create function reveal_question_answer(p_attempt_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_letter char(1);
begin
  update question_attempts qa
     set revealed_at = coalesce(qa.revealed_at, app_now())
    from public_questions q
   where qa.id = p_attempt_id
     and qa.student_id = auth.uid()
     and q.id = qa.question_id
  returning q.correct_letter into v_letter;

  if v_letter is null then
    raise exception 'Attempt not found.';
  end if;

  return json_build_object('attempt_id', p_attempt_id, 'correct_letter', v_letter);
end;
$$;

revoke execute on function reveal_question_answer(uuid) from public, anon;
grant execute on function reveal_question_answer(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Contexto completo de uma tentativa para o prompt do tutor — inclui o
-- gabarito, então é só do servidor (service_role). A rota passa o id do aluno
-- da sessão; a função confere a posse.
-- ----------------------------------------------------------------------------
create function question_tutor_context(p_attempt_id uuid, p_student uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'attempt_id', qa.id,
    'chosen_letter', qa.chosen_letter,
    'correct', qa.correct,
    'revealed', qa.revealed_at is not null,
    'question', json_build_object(
      'id', q.id,
      'exam_label', q.exam_label,
      'item_number', q.item_number,
      'subject', q.subject,
      'concept_name', c.name,
      'stem', q.stem,
      'alternatives', q.alternatives,
      'correct_letter', q.correct_letter
    )
  )
  from question_attempts qa
  join public_questions q on q.id = qa.question_id
  left join concepts c on c.id = q.concept_id
  where qa.id = p_attempt_id and qa.student_id = p_student
$$;

revoke execute on function question_tutor_context(uuid, uuid) from public, anon, authenticated;
grant execute on function question_tutor_context(uuid, uuid) to service_role;

-- ----------------------------------------------------------------------------
-- Simulação concluída (todos os desafios da coruja): recompensa uma vez.
-- O id é validado contra o catálogo pela rota; aqui só o formato.
-- ----------------------------------------------------------------------------
create function complete_simulation(p_simulation_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c_points constant integer := 20;
  c_coins constant integer := 5;
  v_student uuid := auth.uid();
  v_inserted integer;
begin
  if not exists (select 1 from students where id = v_student) then
    raise exception 'Only students can complete simulations.';
  end if;

  insert into simulation_completions (student_id, simulation_id)
  values (v_student, p_simulation_id)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return json_build_object('awarded', false);
  end if;

  perform award_reward(v_student, 'simulation', c_points, c_coins, p_simulation_id);
  perform register_activity(v_student);

  return json_build_object('awarded', true, 'points', c_points, 'coins', c_coins);
end;
$$;

revoke execute on function complete_simulation(text) from public, anon;
grant execute on function complete_simulation(text) to authenticated;
