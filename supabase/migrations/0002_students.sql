create type grade_band as enum ('elementary_1', 'elementary_2', 'high_school');

-- Extends a profile with student-specific fields. `linking_code` is the
-- consent mechanism a student shares with their parent — a parent can only
-- ever gain access to a student's data by presenting this code through the
-- link_student_by_code() RPC (see 0006_functions_and_rls.sql), never by
-- guessing or referencing the student's UUID directly.
create table students (
  id uuid primary key references profiles(id) on delete cascade,
  grade_level grade_band,              -- nullable until onboarding completes
  school_name text,
  linking_code text unique not null,
  created_at timestamptz not null default now()
);

alter table students enable row level security;

create policy students_select_self on students
  for select using (auth.uid() = id);

-- Only the student themself can update their own row (e.g. onboarding sets
-- grade_level). Parents never get write access here.
create policy students_update_self on students
  for update using (auth.uid() = id);

-- NOTE: the parent-can-read-linked-student policy is added in
-- 0003_parent_links.sql, once parent_student_links exists to reference.
