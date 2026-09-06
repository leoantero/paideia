-- ============================================================================
-- Camada 4: tenancy. Ver docs/LEARNING_GRAPH.md.
--
-- Isso NAO e detalhe comercial que da pra empurrar pra frente: o modelo de
-- negocio e contrato de REDE, cobrado por aluno matriculado, assinado com a
-- mantenedora. Logo: organizations > schools > classes > enrollments.
--
-- Um enrollment ativo E um assento faturavel. Nao crie tabela de billing
-- separada -- ela vai divergir da matricula e voce vai faturar errado.
-- ============================================================================

alter type user_role add value if not exists 'teacher';
alter type user_role add value if not exists 'coordinator';  -- coordenacao da unidade
alter type user_role add value if not exists 'director';     -- mantenedora / rede

-- A mantenedora. E a entidade do contrato.
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  -- preco contratado por aluno/mes, em centavos. Fica aqui porque o contrato
  -- e da rede, nao da unidade.
  seat_price_cents integer,
  contract_started_at date,
  contract_ends_at date,
  created_at timestamptz not null default now()
);

-- A unidade. E o que a coordenacao enxerga.
create table schools (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  city text,
  state text,
  inep_code text,          -- casa com dados publicos (QEdu/Censo Escolar)
  created_at timestamptz not null default now()
);

create index schools_org_idx on schools (organization_id);

create table school_classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,                  -- '8o ano B'
  grade_year smallint not null,
  academic_year smallint not null,
  created_at timestamptz not null default now()
);

create index school_classes_school_idx on school_classes (school_id, academic_year);

-- Matricula do aluno na turma. E O ASSENTO FATURAVEL.
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references school_classes(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  started_at date not null default current_date,
  ended_at date,
  unique (student_id, class_id)
);

create index enrollments_class_idx on enrollments (class_id) where status = 'active';
create index enrollments_student_idx on enrollments (student_id) where status = 'active';

-- Vinculo de professor/coordenacao. Professor e por turma; coordenacao e por
-- unidade; direcao e por rede. O escopo do papel mora aqui, nao no perfil.
create table staff_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  class_id uuid references school_classes(id) on delete cascade,
  subject text,
  created_at timestamptz not null default now(),
  -- exatamente um escopo por linha
  check (num_nonnulls(organization_id, school_id, class_id) = 1)
);

create index staff_assignments_profile_idx on staff_assignments (profile_id);

alter table organizations enable row level security;
alter table schools enable row level security;
alter table school_classes enable row level security;
alter table enrollments enable row level security;
alter table staff_assignments enable row level security;

-- ============================================================================
-- Helpers de escopo. Definidos como funcoes pra que as policies fiquem legiveis
-- e pra que a regra de "quem ve o que" exista em UM lugar so.
-- ============================================================================

-- Turmas que o usuario logado alcanca, seja por vinculo direto de turma,
-- por unidade (coordenacao) ou por rede (direcao).
create function accessible_class_ids()
returns table (class_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select sc.id
  from school_classes sc
  join schools s on s.id = sc.school_id
  where exists (
    select 1 from staff_assignments sa
    where sa.profile_id = auth.uid()
      and (
        sa.class_id = sc.id
        or sa.school_id = s.id
        or sa.organization_id = s.organization_id
      )
  );
$$;

grant execute on function accessible_class_ids() to authenticated;

create policy staff_assignments_select_own on staff_assignments
  for select using (auth.uid() = profile_id);

create policy school_classes_select_scoped on school_classes
  for select using (id in (select class_id from accessible_class_ids()));

create policy enrollments_select_scoped on enrollments
  for select using (
    auth.uid() = student_id
    or class_id in (select class_id from accessible_class_ids())
  );

create policy schools_select_scoped on schools
  for select using (
    exists (
      select 1 from staff_assignments sa
      where sa.profile_id = auth.uid()
        and (sa.school_id = schools.id or sa.organization_id = schools.organization_id)
    )
  );

create policy organizations_select_scoped on organizations
  for select using (
    exists (
      select 1 from staff_assignments sa
      where sa.profile_id = auth.uid() and sa.organization_id = organizations.id
    )
  );

-- ============================================================================
-- Professor le o dominio dos alunos das turmas dele. Politica ADICIONAL a que
-- 0008 ja criou (policies de select sao OR entre si).
--
-- Note o que ele NAO ganha: acesso a learning_events nem a messages. Professor
-- ve dominio agregado e diagnostico, nunca a conversa do aluno. Isso e o
-- "what parents DON'T see" do PEDAGOGY.md estendido pro corpo docente, e e o
-- que faz o DPA da rede ser assinavel.
-- ============================================================================
create policy concept_mastery_select_staff on concept_mastery
  for select using (
    exists (
      select 1 from enrollments e
      where e.student_id = concept_mastery.student_id
        and e.status = 'active'
        and e.class_id in (select class_id from accessible_class_ids())
    )
  );

-- ============================================================================
-- Assentos faturaveis por rede. E a fatura, direto da matricula.
-- ============================================================================
create view billable_seats as
  select
    o.id as organization_id,
    o.name as organization_name,
    o.seat_price_cents,
    count(distinct e.student_id) as active_seats,
    (count(distinct e.student_id) * coalesce(o.seat_price_cents, 0)) as monthly_cents
  from organizations o
  join schools s on s.organization_id = o.id
  join school_classes sc on sc.school_id = s.id
  join enrollments e on e.class_id = sc.id and e.status = 'active'
  group by o.id, o.name, o.seat_price_cents;
