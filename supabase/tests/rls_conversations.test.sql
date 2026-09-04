-- Verifies the hard privacy requirement from docs/PEDAGOGY.md: a parent must
-- get ZERO rows from conversations/messages, even for their own linked
-- child. There is no policy anywhere granting parents access to these
-- tables — this test proves that holds, not just that it's undocumented.
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

insert into parent_student_links (parent_id, student_id, status) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'active');

-- Student creates a conversation and sends a message.
set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into conversations (id, student_id, subject)
values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'math');

insert into messages (conversation_id, role, content)
values ('44444444-4444-4444-4444-444444444444', 'student', 'What is 12 times 8?');

select is(
  (select count(*) from conversations)::int, 1,
  'student can see their own conversation'
);

-- Now switch to the linked parent's session.
set local request.jwt.claims to '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select is_empty(
  $$ select id from conversations $$,
  'linked parent gets zero rows from conversations, even for their own child'
);

select is_empty(
  $$ select id from messages $$,
  'linked parent gets zero rows from messages, even for their own child'
);

select * from finish();
rollback;
