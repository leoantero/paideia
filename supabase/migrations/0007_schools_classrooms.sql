-- Schools and classrooms. The platform is sold to a school as a whole, so a
-- student belongs to one classroom (e.g. "8º ano A") of one school; the
-- classroom is the scope of the gamification leaderboard.
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table classrooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  grade_level grade_band not null,
  school_year integer not null,
  join_code text unique not null,
  created_at timestamptz not null default now()
);

alter table students add column classroom_id uuid references classrooms(id) on delete set null;
create index students_classroom_idx on students (classroom_id);

alter table schools enable row level security;
alter table classrooms enable row level security;

create policy classrooms_select_member on classrooms
  for select using (
    exists (select 1 from students s where s.id = auth.uid() and s.classroom_id = classrooms.id)
  );

create policy schools_select_member on schools
  for select using (
    exists (
      select 1 from students s
      join classrooms c on c.id = s.classroom_id
      where s.id = auth.uid() and c.school_id = schools.id
    )
  );

-- students_update_self (0002) would otherwise let a student point
-- classroom_id at any classroom UUID, skipping the join code. Column-level
-- grants keep self-service updates to the onboarding fields only.
revoke update on students from anon, authenticated;
grant update (grade_level, school_name) on students to authenticated;

-- ============================================================================
-- Clock helpers. All "day" logic (streaks, due dates, daily goals, weekly
-- leaderboard) uses the school's local calendar, not UTC. `paideia.now` is a
-- test-only override: PostgREST exposes no way for a client to set it.
-- ============================================================================
create function app_now() returns timestamptz
language sql stable
as $$
  select coalesce(nullif(current_setting('paideia.now', true), '')::timestamptz, now())
$$;

create function app_today() returns date
language sql stable
as $$
  select (app_now() at time zone 'America/Sao_Paulo')::date
$$;

create function app_day_start(p_day date) returns timestamptz
language sql immutable
as $$
  select p_day::timestamp at time zone 'America/Sao_Paulo'
$$;

create function app_week_start() returns timestamptz
language sql stable
as $$
  select app_day_start(date_trunc('week', app_today())::date)
$$;

-- "Ana Souza" -> "Ana S." — classmates only ever see this short form.
create function short_display_name(p_full_name text) returns text
language sql immutable
as $$
  select case
    when p_full_name is null or btrim(p_full_name) = '' then 'Aluno'
    when array_length(regexp_split_to_array(btrim(p_full_name), '\s+'), 1) = 1 then btrim(p_full_name)
    else split_part(btrim(p_full_name), ' ', 1) || ' '
         || upper(left((regexp_split_to_array(btrim(p_full_name), '\s+'))[array_length(regexp_split_to_array(btrim(p_full_name), '\s+'), 1)], 1)) || '.'
  end
$$;

-- The only way to join a classroom: presenting its join code (handed out by
-- the school), mirroring link_student_by_code() for parents.
create function join_classroom(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_classroom classrooms%rowtype;
  v_school_name text;
begin
  if not exists (select 1 from students where id = auth.uid()) then
    raise exception 'Only students can join a classroom.';
  end if;

  select * into v_classroom from classrooms where join_code = upper(btrim(p_code));
  if v_classroom.id is null then
    raise exception 'Invalid classroom code.';
  end if;

  select name into v_school_name from schools where id = v_classroom.school_id;

  update students
     set classroom_id = v_classroom.id,
         grade_level = v_classroom.grade_level,
         school_name = v_school_name
   where id = auth.uid();

  return json_build_object(
    'classroom_id', v_classroom.id,
    'classroom_name', v_classroom.name,
    'school_name', v_school_name
  );
end;
$$;

revoke execute on function join_classroom(text) from public, anon;
grant execute on function join_classroom(text) to authenticated;
