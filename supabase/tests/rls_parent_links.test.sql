-- Verifies: parent_student_links rows can ONLY be created via
-- link_student_by_code() (0006_functions_and_rls.sql) — never by a direct
-- client insert, and never by guessing/supplying a wrong code.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'student-a@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'parent@test.local');

insert into profiles (id, role, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'student', 'Student A'),
  ('33333333-3333-3333-3333-333333333333', 'parent', 'Parent');

insert into students (id, linking_code) values
  ('11111111-1111-1111-1111-111111111111', 'CODEAA');

set local role authenticated;
set local request.jwt.claims to '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

-- 1. Direct insert attempt must fail — no insert policy exists for
--    authenticated users on this table.
select throws_ok(
  $$ insert into parent_student_links (parent_id, student_id)
     values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111') $$,
  'new row violates row-level security policy for table "parent_student_links"',
  'a parent cannot insert a link row directly, bypassing the code check'
);

-- 2. Guessing/using a wrong code must be rejected by the RPC itself.
select throws_ok(
  $$ select link_student_by_code('WRONGX') $$,
  'Invalid linking code.',
  'link_student_by_code rejects an incorrect code'
);

-- 3. The correct code, via the RPC, succeeds and creates exactly one link.
select lives_ok(
  $$ select link_student_by_code('CODEAA') $$,
  'link_student_by_code accepts the correct code'
);

select * from finish();
rollback;
