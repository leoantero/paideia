-- Deliberately coarse, qualitative fields only — no raw answers, no
-- question-by-question detail. This matches the "GOOD" parent-dashboard
-- example in docs/SETUP.md: subject strengths/weak areas/trend, nothing
-- more granular. Real mastery scoring is later work (see
-- docs/ARCHITECTURE.md, Evolution Path) — for Phase 1 this is a heuristic
-- stub populated by record_tutoring_session() in 0006_functions_and_rls.sql.
create table performance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject text not null,
  strength_level text not null check (strength_level in ('strong', 'average', 'weak')),
  trend text not null check (trend in ('improving', 'stable', 'declining')),
  session_count integer not null default 0,
  last_updated timestamptz not null default now(),
  unique (student_id, subject)
);

alter table performance_records enable row level security;

-- Student or an actively-linked parent can read. No insert/update policy
-- for the 'authenticated' role — the only writer is the
-- record_tutoring_session() security-definer RPC, so a parent (or a
-- compromised client) cannot forge a rosier performance record directly.
create policy performance_select_self_or_parent on performance_records
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from parent_student_links l
      where l.student_id = performance_records.student_id
        and l.parent_id = auth.uid()
        and l.status = 'active'
    )
  );
