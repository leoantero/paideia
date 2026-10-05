-- ============================================================================
-- Repetição espaçada estilo Anki: baralhos curados, memória por aluno de cada
-- card (estado SM-2) e um log de revisões.
--
-- Substitui `concept_cards` (0014). Lá o vencimento vinha do posterior do BKT
-- POR CONCEITO, então todos os cards de um conceito venciam juntos e o aluno
-- só se autoavaliava ("sabia"/"não sabia"). Aqui cada card tem a própria
-- agenda, e existem cards corrigidos no servidor (múltipla escolha, resposta
-- curta) e cards abertos avaliados pelo tutor socrático.
--
-- O que NÃO muda: card ancorado em `concept_id` continua virando evidência
-- `retrieval_review` no learning graph (a rota /api/study/* chama
-- evidence-recorder.ts dentro de `after()`, server-only). O SM-2 só decide
-- QUANDO o card volta; o domínio do conceito segue sendo o BKT sobre
-- evidência. Os cards de 0014 são migrados abaixo com o mesmo id, então o
-- `source_ref` dos learning_events antigos continua apontando para eles.
-- ============================================================================
create type card_kind as enum ('multiple_choice', 'short_answer', 'open', 'flashcard');
create type content_review_status as enum ('pending_review', 'approved', 'rejected');
create type review_grade as enum ('again', 'hard', 'good', 'easy');

-- Conteúdo vem de content/decks/*.json e de scripts/data/ (npm run seed).
-- Entra como 'pending_review' e fica invisível ao aluno até um humano aprovar
-- (CLAUDE.md: nenhum conteúdo gerado por IA sem revisão).
create table decks (
  id text primary key,
  title text not null,
  subject text not null,
  grade_level grade_band not null,
  description text not null default '',
  bncc_codes text[] not null default '{}',
  sources jsonb not null default '[]',
  review_status content_review_status not null default 'pending_review',
  created_at timestamptz not null default now()
);

create table cards (
  id text primary key,
  deck_id text not null references decks(id) on delete cascade,
  -- âncora no learning graph; null = card sem conceito (não gera evidência)
  concept_id uuid references concepts(id) on delete set null,
  position integer not null,
  kind card_kind not null,
  prompt text not null,
  answer text not null,
  choices text[],
  correct_choice integer,
  accepted_answers text[],
  unique (deck_id, position),
  check (
    kind <> 'multiple_choice'
    or (choices is not null
        and array_length(choices, 1) between 2 and 5
        and correct_choice between 0 and array_length(choices, 1) - 1)
  ),
  check (kind <> 'short_answer' or array_length(accepted_answers, 1) >= 1)
);

create index cards_concept_idx on cards (concept_id);

-- Uma linha por (aluno, card) depois que o card foi visto: a "memória" do que
-- o aluno acertou ou errou, que decide quando ele volta.
create table card_states (
  student_id uuid not null references students(id) on delete cascade,
  card_id text not null references cards(id) on delete cascade,
  repetitions integer not null default 0,
  ease numeric(4, 2) not null default 2.50,
  interval_days integer not null default 0,
  lapses integer not null default 0,
  due_on date not null,
  introduced_on date not null default app_today(),
  last_reviewed_at timestamptz,
  primary key (student_id, card_id)
);

create index card_states_due_idx on card_states (student_id, due_on);

-- De propósito não há coluna com a resposta digitada: a correção acontece na
-- escrita e o texto em si nunca é guardado (minimização de dados).
create table review_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  card_id text not null references cards(id) on delete cascade,
  grade review_grade not null,
  duration_ms integer not null check (duration_ms between 0 and 60000),
  reviewed_at timestamptz not null default app_now()
);

create index review_logs_student_time_idx on review_logs (student_id, reviewed_at);

alter table decks enable row level security;
alter table cards enable row level security;
alter table card_states enable row level security;
alter table review_logs enable row level security;

create policy decks_select_approved on decks
  for select to authenticated using (review_status = 'approved');

create policy cards_select_approved on cards
  for select to authenticated using (
    exists (select 1 from decks d where d.id = cards.deck_id and d.review_status = 'approved')
  );

-- Leitura só do dono; escrita só via record_review(). Responsável e professor
-- não veem histórico por card (docs/PEDAGOGY.md: nada de "errou a questão X")
-- — eles veem o domínio por conceito, que vem da evidência.
create policy card_states_select_own on card_states
  for select using (auth.uid() = student_id);

create policy review_logs_select_own on review_logs
  for select using (auth.uid() = student_id);

-- ----------------------------------------------------------------------------
-- Migração dos cards de 0014: um baralho por (matéria, segmento), já aprovado
-- porque esses cards já estavam no ar para os alunos. O id do card é mantido.
-- ----------------------------------------------------------------------------
insert into decks (id, title, subject, grade_level, description, review_status)
select distinct
  'conceitos-' || c.subject || '-' || c.grade_band,
  'Conceitos de ' || case c.subject
    when 'math' then 'Matemática'
    when 'language' then 'Português'
    when 'physics' then 'Física'
    when 'history' then 'História'
    when 'biology' then 'Biologia'
    when 'chemistry' then 'Química'
    when 'science' then 'Ciências'
    else c.subject
  end,
  c.subject,
  c.grade_band,
  'Um card por ideia-chave dos conceitos do currículo.',
  'approved'::content_review_status
from concept_cards cc
join concepts c on c.id = cc.concept_id;

insert into cards (id, deck_id, concept_id, position, kind, prompt, answer)
select
  cc.id::text,
  'conceitos-' || c.subject || '-' || c.grade_band,
  cc.concept_id,
  row_number() over (partition by c.subject, c.grade_band order by c.code, cc.position, cc.front),
  'flashcard',
  cc.front,
  cc.back
from concept_cards cc
join concepts c on c.id = cc.concept_id;

drop table concept_cards;

-- ----------------------------------------------------------------------------
-- Regras
-- ----------------------------------------------------------------------------
create function daily_new_card_limit(p_grade grade_band) returns integer
language sql immutable
as $$
  select case p_grade
    when 'elementary_2' then 10
    when 'high_school' then 15
    else 5
  end
$$;

-- Minúsculas, sem acento e pontuação, espaços colapsados — para que
-- "Fotossíntese." e "fotossintese" batam.
create function normalize_answer(p_text text) returns text
language sql immutable
as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(p_text, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
    '[^a-z0-9-]+', ' ', 'g'
  ))
$$;

-- SM-2 com os botões do Anki. 'again' devolve o card à fila de hoje
-- (intervalo 0) para reaprender na mesma sessão; primeiros intervalos curtos
-- (1, depois 3 dias) servem melhor a quem está em idade escolar.
create function sm2_schedule(
  p_repetitions integer,
  p_ease numeric,
  p_interval integer,
  p_grade review_grade,
  out repetitions integer,
  out ease numeric,
  out interval_days integer
)
language plpgsql immutable
as $$
begin
  case p_grade
    when 'again' then
      repetitions := 0;
      ease := greatest(1.30, p_ease - 0.20);
      interval_days := 0;
    when 'hard' then
      repetitions := p_repetitions + 1;
      ease := greatest(1.30, p_ease - 0.15);
      interval_days := greatest(1, round(p_interval * 1.2)::integer);
    when 'good' then
      repetitions := p_repetitions + 1;
      ease := p_ease;
      interval_days := case p_repetitions
        when 0 then 1
        when 1 then 3
        else greatest(p_interval + 1, round(p_interval * p_ease)::integer)
      end;
    when 'easy' then
      repetitions := p_repetitions + 1;
      ease := p_ease + 0.15;
      interval_days := case p_repetitions
        when 0 then 3
        when 1 then 6
        else greatest(p_interval + 1, round(p_interval * p_ease * 1.3)::integer)
      end;
  end case;
  interval_days := least(interval_days, 180);
end;
$$;

-- ----------------------------------------------------------------------------
-- Fila de estudo: vencidos primeiro (mais antigos antes), depois novos até o
-- limite diário, intercalando matérias (card 1 de cada baralho, depois o 2…).
-- Nunca inclui respostas — só record_review() as devolve. A exceção é o verso
-- do flashcard (`back`): ele é autoavaliado, então não há gabarito a
-- proteger, e o aluno precisa vê-lo antes de dar a nota. Roda como o
-- chamador, então a RLS de baralhos aprovados vale.
-- ----------------------------------------------------------------------------
create function get_study_queue(p_deck_id text default null, p_limit integer default 20)
returns json
language plpgsql
stable
set search_path = public
as $$
declare
  v_today date := app_today();
  v_grade grade_band;
  v_new_left integer;
  v_result json;
begin
  select grade_level into v_grade from students where id = auth.uid();

  select greatest(0, daily_new_card_limit(v_grade) - count(*))
    into v_new_left
  from card_states
  where student_id = auth.uid() and introduced_on = v_today;

  with due as (
    select c.id, c.deck_id, d.title as deck_title, d.subject, c.kind, c.prompt, c.choices,
           case when c.kind = 'flashcard' then c.answer end as back,
           false as is_new, 0 as bucket, cs.due_on as sort_date, c.position, d.id as sort_deck
    from card_states cs
    join cards c on c.id = cs.card_id
    join decks d on d.id = c.deck_id
    where cs.student_id = auth.uid()
      and cs.due_on <= v_today
      and (p_deck_id is null or c.deck_id = p_deck_id)
  ),
  fresh as (
    select c.id, c.deck_id, d.title as deck_title, d.subject, c.kind, c.prompt, c.choices,
           case when c.kind = 'flashcard' then c.answer end as back,
           true as is_new, 1 as bucket, v_today as sort_date, c.position, d.id as sort_deck
    from cards c
    join decks d on d.id = c.deck_id
    where (p_deck_id is null or c.deck_id = p_deck_id)
      and (v_grade is null or d.grade_level = v_grade)
      and not exists (
        select 1 from card_states cs where cs.student_id = auth.uid() and cs.card_id = c.id
      )
    order by c.position, d.id
    limit v_new_left
  ),
  queue as (
    select * from due
    union all
    select * from fresh
    order by bucket, sort_date, position, sort_deck
    limit p_limit
  )
  select coalesce(json_agg(json_build_object(
    'id', id, 'deck_id', deck_id, 'deck_title', deck_title, 'subject', subject,
    'kind', kind, 'prompt', prompt, 'choices', choices, 'back', back, 'is_new', is_new
  ) order by bucket, sort_date, position, sort_deck), '[]'::json)
  into v_result
  from queue;

  return v_result;
end;
$$;

revoke execute on function get_study_queue(text, integer) from public, anon;
grant execute on function get_study_queue(text, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- record_review(): corrige no servidor (múltipla escolha / resposta curta) ou
-- aceita a nota vinda de fora — da avaliação socrática de um card aberto, ou
-- da autoavaliação de um flashcard —, reagenda com SM-2 e credita recompensas.
--
-- Antifarm: só cards vencidos (ou novos, dentro do limite diário) podem ser
-- revisados, e pontos só valem na primeira revisão do card no dia.
-- Limitação conhecida: em 'open' e 'flashcard' a nota não é verificável — um
-- aluno chamando a RPC direto se autoavalia, como no Anki — limitado pelas
-- regras acima. A evidência no learning graph é gravada pela rota, não aqui.
-- ----------------------------------------------------------------------------
create function record_review(
  p_card_id text,
  p_response text default null,
  p_grade review_grade default null,
  p_duration_ms integer default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_grade_level grade_band;
  v_today date := app_today();
  v_card record;
  v_state card_states%rowtype;
  v_has_state boolean;
  v_grade review_grade;
  v_next record;
  v_first_today boolean;
  v_points integer := 0;
  v_coins integer := 0;
  v_study_ms integer;
  v_goal_completed boolean := false;
begin
  select grade_level into v_grade_level from students where id = v_student;
  if not found then
    raise exception 'Only students can review cards.';
  end if;

  select c.*, d.subject, co.intrinsic_difficulty as concept_difficulty into v_card
  from cards c
  join decks d on d.id = c.deck_id
  left join concepts co on co.id = c.concept_id
  where c.id = p_card_id and d.review_status = 'approved';
  if not found then
    raise exception 'Card not available.';
  end if;

  select * into v_state from card_states
  where student_id = v_student and card_id = p_card_id
  for update;
  v_has_state := found;

  if v_has_state and v_state.due_on > v_today then
    raise exception 'Card is not due yet.';
  end if;

  if not v_has_state and (
    select count(*) from card_states where student_id = v_student and introduced_on = v_today
  ) >= daily_new_card_limit(v_grade_level) then
    raise exception 'Daily new-card limit reached.';
  end if;

  if v_card.kind = 'multiple_choice' then
    v_grade := case
      when btrim(coalesce(p_response, '')) ~ '^\d+$' and btrim(p_response)::integer = v_card.correct_choice
      then 'good' else 'again'
    end;
  elsif v_card.kind = 'short_answer' then
    v_grade := case
      when normalize_answer(p_response) <> ''
       and normalize_answer(p_response) in (select normalize_answer(a) from unnest(v_card.accepted_answers) a)
      then 'good' else 'again'
    end;
  else
    if p_grade is null then
      raise exception 'Open cards and flashcards require a grade.';
    end if;
    v_grade := p_grade;
  end if;

  select * into v_next from sm2_schedule(
    coalesce(v_state.repetitions, 0), coalesce(v_state.ease, 2.50), coalesce(v_state.interval_days, 0), v_grade
  );

  insert into card_states (student_id, card_id, repetitions, ease, interval_days, lapses, due_on, last_reviewed_at)
  values (v_student, p_card_id, v_next.repetitions, v_next.ease, v_next.interval_days, 0,
          v_today + v_next.interval_days, app_now())
  on conflict (student_id, card_id) do update
    set repetitions = excluded.repetitions,
        ease = excluded.ease,
        interval_days = excluded.interval_days,
        lapses = card_states.lapses + case when v_grade = 'again' and card_states.repetitions > 0 then 1 else 0 end,
        due_on = excluded.due_on,
        last_reviewed_at = excluded.last_reviewed_at;

  v_first_today := not exists (
    select 1 from review_logs
    where student_id = v_student and card_id = p_card_id and reviewed_at >= app_day_start(v_today)
  );

  insert into review_logs (student_id, card_id, grade, duration_ms)
  values (v_student, p_card_id, v_grade, least(greatest(coalesce(p_duration_ms, 0), 0), 60000));

  if v_first_today then
    v_points := case v_grade when 'again' then 2 when 'hard' then 5 when 'good' then 8 else 10 end;
    v_coins := case when v_grade in ('good', 'easy') then 1 else 0 end;
    perform award_reward(v_student, 'card_review', v_points, v_coins, p_card_id);
  end if;

  perform register_activity(v_student);

  select coalesce(sum(duration_ms), 0) into v_study_ms
  from review_logs where student_id = v_student and reviewed_at >= app_day_start(v_today);

  if v_study_ms >= daily_goal_minutes(v_grade_level) * 60000 and not exists (
    select 1 from reward_events
    where student_id = v_student and source = 'daily_goal' and created_at >= app_day_start(v_today)
  ) then
    perform award_reward(v_student, 'daily_goal', 30, 10, v_today::text);
    v_goal_completed := true;
  end if;

  return json_build_object(
    'card_id', p_card_id,
    'concept_id', v_card.concept_id,
    'concept_difficulty', v_card.concept_difficulty,
    'first_today', v_first_today,
    'grade', v_grade,
    'correct', v_grade <> 'again',
    'answer', v_card.answer,
    'correct_choice', v_card.correct_choice,
    'interval_days', v_next.interval_days,
    'next_due_on', v_today + v_next.interval_days,
    'points', v_points,
    'coins', v_coins,
    'daily_goal_completed', v_goal_completed
  );
end;
$$;

revoke execute on function record_review(text, text, review_grade, integer) from public, anon;
grant execute on function record_review(text, text, review_grade, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Modelos de leitura da UI do aluno. Rodam como o chamador (RLS vale).
-- ----------------------------------------------------------------------------
create function get_my_progress()
returns json
language plpgsql
stable
set search_path = public
as $$
declare
  v_today date := app_today();
  v_today_start timestamptz := app_day_start(app_today());
  v_grade grade_band;
  v_progress student_progress%rowtype;
  v_new_left integer;
  v_unseen integer;
begin
  select grade_level into v_grade from students where id = auth.uid();
  select * into v_progress from student_progress where student_id = auth.uid();

  select greatest(0, daily_new_card_limit(v_grade) - count(*)) into v_new_left
  from card_states where student_id = auth.uid() and introduced_on = v_today;

  select count(*) into v_unseen
  from cards c join decks d on d.id = c.deck_id
  where (v_grade is null or d.grade_level = v_grade)
    and not exists (select 1 from card_states cs where cs.student_id = auth.uid() and cs.card_id = c.id);

  return json_build_object(
    'coins', coalesce(v_progress.coins, 0),
    'total_points', coalesce(v_progress.total_points, 0),
    'weekly_points', (
      select coalesce(sum(points), 0) from reward_events
      where student_id = auth.uid() and created_at >= app_week_start()
    ),
    'streak', effective_streak(v_progress.last_active_on, coalesce(v_progress.streak_current, 0),
                               coalesce(v_progress.streak_freezes, 0), v_today),
    'streak_best', coalesce(v_progress.streak_best, 0),
    'active_today', coalesce(v_progress.last_active_on = v_today, false),
    'streak_freezes', coalesce(v_progress.streak_freezes, 0),
    'max_streak_freezes', 2,
    'streak_freeze_cost', 50,
    'daily_goal_minutes', daily_goal_minutes(v_grade),
    'study_seconds_today', (
      select coalesce(sum(duration_ms), 0) / 1000 from review_logs
      where student_id = auth.uid() and reviewed_at >= v_today_start
    ),
    'daily_goal_reached', exists (
      select 1 from reward_events
      where student_id = auth.uid() and source = 'daily_goal' and created_at >= v_today_start
    ),
    'due_today', (
      select count(*) from card_states where student_id = auth.uid() and due_on <= v_today
    ),
    'new_available', least(v_new_left, v_unseen)
  );
end;
$$;

revoke execute on function get_my_progress() from public, anon;
grant execute on function get_my_progress() to authenticated;

create function get_deck_overview()
returns json
language sql
stable
set search_path = public
as $$
  select coalesce(json_agg(row_to_json(o) order by o.subject, o.title), '[]'::json)
  from (
    select
      d.id, d.title, d.subject, d.description,
      count(c.id) as total_cards,
      count(cs.card_id) as seen_cards,
      count(cs.card_id) filter (where cs.due_on <= app_today()) as due_cards,
      count(cs.card_id) filter (where cs.interval_days >= 21) as mastered_cards
    from decks d
    join cards c on c.deck_id = d.id
    left join card_states cs on cs.card_id = c.id and cs.student_id = auth.uid()
    where d.grade_level = coalesce(
      (select grade_level from students where id = auth.uid()), d.grade_level
    )
    group by d.id
  ) o
$$;

revoke execute on function get_deck_overview() from public, anon;
grant execute on function get_deck_overview() to authenticated;
