-- ============================================================================
-- handle_new_user(): populates profiles (+ students, if role='student') the
-- instant a row appears in auth.users. Reads role/full_name from the
-- metadata the client passed to supabase.auth.signUp({ options: { data } }).
-- Runs as security definer so it can write to `profiles`/`students` despite
-- those tables having no client-facing insert policy — this is the one
-- deliberate, narrow bypass of RLS in the whole schema, and it only ever
-- inserts a fresh row scoped to the newly created auth.users.id.
-- ============================================================================
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'student')::user_role,
    new.raw_user_meta_data ->> 'full_name'
  );

  if (new.raw_user_meta_data ->> 'role') = 'student' then
    insert into students (id, linking_code)
    values (new.id, upper(substr(md5(random()::text || new.id::text), 1, 6)));
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- link_student_by_code(): the ONLY way a parent_student_links row is ever
-- created (see 0003_parent_links.sql — there is no client insert policy on
-- that table). Looks the student up by their linking_code, not by UUID, so
-- a parent must have been given the code by the student — this is the
-- consent mechanism for the whole parent-visibility feature.
-- ============================================================================
create function link_student_by_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
begin
  select id into v_student_id from students where linking_code = upper(p_code);

  if v_student_id is null then
    raise exception 'Invalid linking code.';
  end if;

  insert into parent_student_links (parent_id, student_id)
  values (auth.uid(), v_student_id)
  on conflict (parent_id, student_id) do update set status = 'active';

  return json_build_object('student_id', v_student_id);
end;
$$;

grant execute on function link_student_by_code(text) to authenticated;

-- ============================================================================
-- record_tutoring_session(): the ONLY writer of performance_records (see
-- 0005_performance_records.sql — no client insert/update policy exists).
-- Always writes against auth.uid(), i.e. the calling student's own row, so
-- even though this runs as security definer it cannot be used to write
-- another student's performance data.
--
-- HEURISTIC STUB: this is deliberately simplistic (see comment in
-- src/features/performance/performance-service.ts). Keep computeNextTrend()
-- in that file in sync with the trend logic below if either changes.
-- ============================================================================
create function record_tutoring_session(p_subject text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into performance_records (student_id, subject, strength_level, trend, session_count)
  values (auth.uid(), p_subject, 'average', 'stable', 1)
  on conflict (student_id, subject) do update
    set session_count = performance_records.session_count + 1,
        trend = case
          when performance_records.session_count + 1 >= 3 then 'improving'
          else 'stable'
        end,
        last_updated = now();
end;
$$;

grant execute on function record_tutoring_session(text) to authenticated;
