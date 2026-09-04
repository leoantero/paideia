create type message_role as enum ('student', 'assistant');

create table conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject text,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conversations enable row level security;

-- Owner-only, full access. Critically: NO policy anywhere in this file
-- grants a parent any access to conversations or messages. This is the
-- literal enforcement of docs/PEDAGOGY.md's "what parents DON'T see" list
-- (detailed wrong answers, every question asked) — independent of any UI
-- code that might otherwise be tempted to show this data.
create policy conversations_owner_all on conversations
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role message_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy messages_owner_all on messages
  for all
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.student_id = auth.uid()
    )
  );
