-- Verifies: a parent sees only their linked child's performance_records
-- (trend/strength summaries only, per docs/SETUP.md), and that a client
-- cannot write directly to this table — only the record_tutoring_session()
-- security-definer RPC may write (0006_functions_and_rls.sql).
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

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

insert into performance_records (student_id, subject, strength_level, trend, session_count) values
  ('11111111-1111-1111-1111-111111111111', 'math', 'average', 'stable', 1),
  ('22222222-2222-2222-2222-222222222222', 'math', 'weak', 'declining', 1);

set local role authenticated;
set local request.jwt.claims to '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select results_eq(
  $$ select student_id from performance_records order by student_id $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'parent sees only their linked child''s performance record'
);

select throws_ok(
  $$ insert into performance_records (student_id, subject, strength_level, trend)
     values ('11111111-1111-1111-1111-111111111111', 'science', 'strong', 'improving') $$,
  'new row violates row-level security policy for table "performance_records"',
  'a client (even the linked parent) cannot insert directly into performance_records'
);

set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select throws_ok(
  $$ update performance_records set strength_level = 'strong' where student_id = '11111111-1111-1111-1111-111111111111' $$,
  'new row violates row-level security policy for table "performance_records"',
  'a student cannot self-report a better performance record directly either'
);

select * from finish();
rollback;
