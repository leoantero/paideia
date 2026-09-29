-- Spaced repetition ("Anki-style"): curated decks, per-student memory of
-- every card (SM-2 state), and a review log that feeds the parent-facing
-- performance_records with real accuracy instead of the Phase 1 stub.
create type card_kind as enum ('multiple_choice', 'short_answer', 'open');
create type content_review_status as enum ('pending_review', 'approved', 'rejected');
create type review_grade as enum ('again', 'hard', 'good', 'easy');

-- Deck content comes from content/decks/*.json (see scripts/build-seed.ts).
-- It enters as 'pending_review' and is invisible to students until a human
-- approves it (CLAUDE.md: no AI-generated content without review).
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

-- One row per (student, card) once the card has been seen: the "memory" of
-- what the student got right or wrong, which drives when it comes back.
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

-- Deliberately no free-text answer column: grading happens at write time
-- and the typed answer itself is never stored (data minimisation).
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

-- Owner-only reads; writes only through record_review(). Parents get no
-- access to per-card history (docs/PEDAGOGY.md: no detailed wrong answers).
create policy card_states_select_own on card_states
  for select using (auth.uid() = student_id);

create policy review_logs_select_own on review_logs
  for select using (auth.uid() = student_id);

create function daily_new_card_limit(p_grade grade_band) returns integer
language sql immutable
as $$
  select case p_grade
    when 'elementary_2' then 10
    when 'high_school' then 15
    else 5
  end
$$;

-- Lowercase, strip accents and punctuation, collapse whitespace, so that
-- "Fotossíntese." and "fotossintese" match.
create function normalize_answer(p_text text) returns text
language sql immutable
as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(p_text, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
    '[^a-z0-9-]+', ' ', 'g'
  ))
$$;

-- SM-2 variant with Anki-style buttons. 'again' puts the card back into
-- today's queue (interval 0) so it is relearned in the same session; short
-- first intervals (1, then 3 days) suit school-age learners.
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

-- Internal: recomputes the parent-visible, deliberately coarse summary for
-- one subject from the student's last 20 reviews in that subject.
create function refresh_subject_performance(p_student uuid, p_subject text) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_accuracy numeric;
  v_recent numeric;
  v_previous numeric;
  v_strength text;
  v_trend text := 'stable';
begin
  with recent as (
    select (rl.grade <> 'again')::integer as ok,
           row_number() over (order by rl.reviewed_at desc) as rn
    from review_logs rl
    join cards c on c.id = rl.card_id
    join decks d on d.id = c.deck_id
    where rl.student_id = p_student and d.subject = p_subject
    order by rl.reviewed_at desc
    limit 20
  )
  select count(*), avg(ok), avg(ok) filter (where rn <= 10), avg(ok) filter (where rn > 10)
    into v_total, v_accuracy, v_recent, v_previous
  from recent;

  if v_total = 0 then
    return;
  end if;

  v_strength := case
    when v_accuracy >= 0.8 then 'strong'
    when v_accuracy >= 0.5 then 'average'
    else 'weak'
  end;

  if v_previous is not null then
    if v_recent - v_previous >= 0.1 then
      v_trend := 'improving';
    elsif v_recent - v_previous <= -0.1 then
      v_trend := 'declining';
    end if;
  end if;

  insert into performance_records (student_id, subject, strength_level, trend, session_count)
  values (p_student, p_subject, v_strength, v_trend, 0)
  on conflict (student_id, subject) do update
    set strength_level = excluded.strength_level,
        trend = excluded.trend,
        last_updated = now();
end;
$$;

revoke execute on function refresh_subject_performance(uuid, text) from public, anon, authenticated;

-- ============================================================================
-- Study queue: due cards first (oldest first), then new cards up to the
-- daily limit, interleaving subjects (card 1 of each deck, then card 2...).
-- Never includes answers — those are only returned by record_review().
-- Runs as the caller, so the approved-decks RLS policy applies.
-- ============================================================================
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
    'kind', kind, 'prompt', prompt, 'choices', choices, 'is_new', is_new
  ) order by bucket, sort_date, position, sort_deck), '[]'::json)
  into v_result
  from queue;

  return v_result;
end;
$$;

revoke execute on function get_study_queue(text, integer) from public, anon;
grant execute on function get_study_queue(text, integer) to authenticated;

-- ============================================================================
-- record_review(): grades the answer server-side (multiple choice / short
-- answer) or accepts the grade produced by the Socratic evaluation of an
-- open card, reschedules with SM-2, and credits rewards.
--
-- Anti-farming: only due (or new, within the daily limit) cards can be
-- reviewed, and points are credited for the first review of a card per day.
-- Known limitation: for 'open' cards the grade comes from the server route
-- that ran the AI evaluation, but a student calling this RPC directly could
-- self-grade — equivalent to Anki's self-grading, bounded by the rules above.
-- ============================================================================
create function record_review(
  p_card_id text,
  p_response text default null,
  p_open_grade review_grade default null,
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

  select c.*, d.subject into v_card
  from cards c join decks d on d.id = c.deck_id
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
    if p_open_grade is null then
      raise exception 'Open cards require an evaluated grade.';
    end if;
    v_grade := p_open_grade;
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

  perform refresh_subject_performance(v_student, v_card.subject);

  return json_build_object(
    'card_id', p_card_id,
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

-- ============================================================================
-- Read models for the student UI. Both run as the caller (RLS applies).
-- ============================================================================
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
    'active_today', v_progress.last_active_on = v_today,
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
