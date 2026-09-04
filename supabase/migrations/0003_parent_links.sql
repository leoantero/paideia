create type link_status as enum ('active', 'revoked');

-- Deliberately no insert/update/delete policy for the 'authenticated' role
-- on this table. The ONLY way a row is created is through the
-- link_student_by_code() security-definer RPC (0006_functions_and_rls.sql),
-- which looks up the student by their linking_code server-side. This means
-- a parent can never fabricate a link by guessing or supplying a student's
-- UUID directly — they must have been given the actual code by the student.
create table parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status link_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

alter table parent_student_links enable row level security;

create policy links_select_own on parent_student_links
  for select using (auth.uid() = parent_id or auth.uid() = student_id);

-- Now that parent_student_links exists, add the policy on `students` that
-- lets a parent read a linked student's row. This is the actual boundary
-- that lets the parent dashboard function — RLS, not application code.
create policy students_select_linked_parent on students
  for select using (
    exists (
      select 1 from parent_student_links l
      where l.student_id = students.id
        and l.parent_id = auth.uid()
        and l.status = 'active'
    )
  );
