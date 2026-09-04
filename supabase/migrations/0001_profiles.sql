-- Phase 1 role enum. Deliberately only 'student' and 'parent' for now —
-- see docs/ARCHITECTURE.md "Evolution Path" for teacher/director, which can
-- be added later via `alter type user_role add value` without touching
-- existing rows.
create type user_role as enum ('student', 'parent');

-- 1:1 with auth.users. This is the RBAC anchor every other policy in this
-- schema keys off of (via profiles.role or by referencing profiles.id).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- A user can read and update only their own profile row. There is
-- intentionally no insert policy: rows are created exclusively by the
-- handle_new_user() trigger defined in 0006_functions_and_rls.sql, never
-- directly by a client — this prevents a signed-up user from ever setting
-- their own role to something other than what they registered as.
create policy profiles_select_own on profiles
  for select using (auth.uid() = id);

create policy profiles_update_own on profiles
  for update using (auth.uid() = id);
