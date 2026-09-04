-- Verifies: a parent can read only their actively-linked student, never any
-- other student. This is the core "students_select_linked_parent" policy
-- from 0003_parent_links.sql.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'student-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'student-b@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'parent@test.local');

insert into profiles (id, role, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'student', 'Student A'),
  ('22222222-2222-2222-2222-222222222222', 'student', 'Student B'),
  ('33333333-3333-3333-3333-333333333333', 'parent', 'Parent');

insert into students (id, linking_code) values
  ('11111111-1111-1111-1111-111111111111', 'CODEAA'),
  ('22222222-2222-2222-2222-222222222222', 'CODEBB');

insert into parent_student_links (parent_id, student_id, status) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'active');

set local role authenticated;
set local request.jwt.claims to '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select results_eq(
  $$ select id from students order by id $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'parent sees only their actively-linked student, not the unlinked one'
);

select is_empty(
  $$ select id from students where id = '22222222-2222-2222-2222-222222222222' $$,
  'parent cannot see a student they are not linked to'
);

select * from finish();
rollback;
