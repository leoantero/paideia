-- Gamification: points (weekly classroom ranking), gold coins (store),
-- daily streak with purchasable freezes. Per docs/PEDAGOGY.md rewards only
-- come from legitimate learning actions, and every write happens inside
-- security-definer functions: there is no client write policy on these
-- tables, so a student cannot award themself points or coins.
create type reward_source as enum ('card_review', 'daily_goal', 'tutor_session', 'streak_freeze_purchase');

create table student_progress (
  student_id uuid primary key references students(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  total_points integer not null default 0,
  streak_current integer not null default 0,
  streak_best integer not null default 0,
  last_active_on date,
  streak_freezes integer not null default 0 check (streak_freezes between 0 and 2),
  updated_at timestamptz not null default now()
);

-- Append-only ledger. Weekly ranking points are summed from here, which is
-- also what makes "positions moved since yesterday" computable without a
-- scheduled snapshot job.
create table reward_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  source reward_source not null,
  ref text,
  points integer not null default 0,
  coins integer not null default 0,
  created_at timestamptz not null default app_now()
);

create index reward_events_student_time_idx on reward_events (student_id, created_at);

alter table student_progress enable row level security;
alter table reward_events enable row level security;

create policy student_progress_select_own on student_progress
  for select using (auth.uid() = student_id);

create policy reward_events_select_own on reward_events
  for select using (auth.uid() = student_id);

create function daily_goal_minutes(p_grade grade_band) returns integer
language sql immutable
as $$
  select case p_grade
    when 'elementary_2' then 10
    when 'high_school' then 20
    else 5
  end
$$;

-- Streak as the student should see it right now: a missed day covered by an
-- unused freeze keeps the streak alive; freezes are only actually consumed
-- on the next activity (register_activity).
create function effective_streak(p_last_active date, p_streak integer, p_freezes integer, p_today date)
returns integer
language sql immutable
as $$
  select case
    when p_last_active is null then 0
    when p_last_active >= p_today - 1 then p_streak
    when (p_today - p_last_active - 1) <= p_freezes then p_streak
    else 0
  end
$$;

-- Internal: any studying on a calendar day counts toward the streak.
create function register_activity(p_student uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress student_progress%rowtype;
  v_today date := app_today();
  v_missed integer;
  v_streak integer;
  v_freezes integer;
begin
  insert into student_progress (student_id) values (p_student) on conflict do nothing;
  select * into v_progress from student_progress where student_id = p_student for update;

  if v_progress.last_active_on = v_today then
    return;
  end if;

  v_freezes := v_progress.streak_freezes;
  if v_progress.last_active_on is null then
    v_streak := 1;
  else
    v_missed := v_today - v_progress.last_active_on - 1;
    if v_missed = 0 then
      v_streak := v_progress.streak_current + 1;
    elsif v_missed <= v_progress.streak_freezes then
      v_streak := v_progress.streak_current + 1;
      v_freezes := v_progress.streak_freezes - v_missed;
    else
      v_streak := 1;
    end if;
  end if;

  update student_progress
     set streak_current = v_streak,
         streak_best = greatest(streak_best, v_streak),
         streak_freezes = v_freezes,
         last_active_on = v_today,
         updated_at = now()
   where student_id = p_student;
end;
$$;

-- Internal: the single place points/coins are credited.
create function award_reward(
  p_student uuid,
  p_source reward_source,
  p_points integer,
  p_coins integer,
  p_ref text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into student_progress (student_id) values (p_student) on conflict do nothing;

  insert into reward_events (student_id, source, ref, points, coins)
  values (p_student, p_source, p_ref, p_points, p_coins);

  update student_progress
     set coins = coins + p_coins,
         total_points = total_points + p_points,
         updated_at = now()
   where student_id = p_student;
end;
$$;

revoke execute on function register_activity(uuid) from public, anon, authenticated;
revoke execute on function award_reward(uuid, reward_source, integer, integer, text) from public, anon, authenticated;

-- ============================================================================
-- Store: the streak freeze is the one purchasable item for now.
-- ============================================================================
create function buy_streak_freeze()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c_cost constant integer := 50;
  v_progress student_progress%rowtype;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'Only students can buy items.';
  end if;

  insert into student_progress (student_id) values (auth.uid()) on conflict do nothing;
  select * into v_progress from student_progress where student_id = auth.uid() for update;

  if v_progress.streak_freezes >= 2 then
    raise exception 'You already have the maximum number of streak freezes.';
  end if;
  if v_progress.coins < c_cost then
    raise exception 'Not enough coins.';
  end if;

  insert into reward_events (student_id, source, points, coins)
  values (auth.uid(), 'streak_freeze_purchase', 0, -c_cost);

  update student_progress
     set coins = coins - c_cost,
         streak_freezes = streak_freezes + 1,
         updated_at = now()
   where student_id = auth.uid()
  returning * into v_progress;

  return json_build_object('coins', v_progress.coins, 'streak_freezes', v_progress.streak_freezes);
end;
$$;

revoke execute on function buy_streak_freeze() from public, anon;
grant execute on function buy_streak_freeze() to authenticated;

-- ============================================================================
-- Tutoring reward: a session counts once the student has actually engaged
-- (3+ messages), not for a single question (docs/PEDAGOGY.md). Capped per
-- day so opening many conversations doesn't farm coins.
-- ============================================================================
create function reward_tutor_session(p_conversation_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c_points constant integer := 15;
  c_coins constant integer := 3;
  c_daily_cap constant integer := 3;
  v_messages integer;
begin
  if not exists (
    select 1 from conversations where id = p_conversation_id and student_id = auth.uid()
  ) then
    raise exception 'Conversation not found.';
  end if;

  select count(*) into v_messages
  from messages where conversation_id = p_conversation_id and role = 'student';

  if v_messages < 3
     or exists (
       select 1 from reward_events
       where student_id = auth.uid() and source = 'tutor_session' and ref = p_conversation_id::text
     )
     or (
       select count(*) from reward_events
       where student_id = auth.uid() and source = 'tutor_session'
         and created_at >= app_day_start(app_today())
     ) >= c_daily_cap
  then
    return json_build_object('awarded', false);
  end if;

  perform award_reward(auth.uid(), 'tutor_session', c_points, c_coins, p_conversation_id::text);
  perform register_activity(auth.uid());

  return json_build_object('awarded', true, 'points', c_points, 'coins', c_coins);
end;
$$;

revoke execute on function reward_tutor_session(uuid) from public, anon;
grant execute on function reward_tutor_session(uuid) to authenticated;

-- ============================================================================
-- Weekly classroom leaderboard (resets Monday 00:00, school local time).
-- Exposes only the short display name and weekly points of classmates —
-- never their ids, coins or study history. `delta` compares with the
-- ranking at the end of yesterday; null when there is nothing to compare
-- (Monday, or the student had no points yet this week).
-- ============================================================================
create function get_class_leaderboard()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_classroom uuid;
  v_week_start timestamptz := app_week_start();
  v_today_start timestamptz := app_day_start(app_today());
  v_result json;
begin
  select classroom_id into v_classroom from students where id = auth.uid();

  if v_classroom is null then
    return json_build_object('classroom', null, 'entries', '[]'::json, 'member_count', 0);
  end if;

  with members as (
    select s.id, short_display_name(p.full_name) as name
    from students s
    join profiles p on p.id = s.id
    where s.classroom_id = v_classroom
  ),
  totals as (
    select
      m.id,
      m.name,
      coalesce(sum(r.points), 0)::integer as points_now,
      coalesce(sum(r.points) filter (where r.created_at < v_today_start), 0)::integer as points_before_today
    from members m
    left join reward_events r on r.student_id = m.id and r.created_at >= v_week_start
    group by m.id, m.name
  ),
  ranked as (
    select
      t.*,
      rank() over (order by t.points_now desc) as position_now,
      rank() over (order by t.points_before_today desc) as position_before,
      row_number() over (order by t.points_now desc, t.name, t.id) as ordinal
    from totals t
  )
  select json_build_object(
    'classroom', (
      select json_build_object('name', c.name, 'school', sc.name)
      from classrooms c join schools sc on sc.id = c.school_id
      where c.id = v_classroom
    ),
    'week_start', v_week_start,
    'member_count', count(*),
    'entries', coalesce(
      json_agg(
        json_build_object(
          'position', position_now,
          'name', name,
          'weekly_points', points_now,
          'delta', case
            when v_today_start <= v_week_start or points_before_today = 0 then null
            else position_before - position_now
          end,
          'is_me', id = auth.uid()
        ) order by ordinal
      ) filter (where ordinal <= 10 or id = auth.uid()),
      '[]'::json
    )
  )
  into v_result
  from ranked;

  return v_result;
end;
$$;

revoke execute on function get_class_leaderboard() from public, anon;
grant execute on function get_class_leaderboard() to authenticated;
