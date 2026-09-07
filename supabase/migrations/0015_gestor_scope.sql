-- ============================================================================
-- Escopo do gestor (role 'director').
--
-- Hierarquia (decisão #2 do docs/REDESIGN_PLAN.md): o vínculo mora em
-- `staff_assignments` — `school_id` = diretor de unidade, `organization_id` =
-- diretor de rede. accessible_class_ids() (0009) já resolve os dois casos, e
-- com ele o gestor já lê concept_mastery, enrollments, school_classes,
-- schools e organizations dentro do escopo dele.
--
-- Faltavam duas coisas, que é o que esta migration entrega:
--
--  1. Ver o CORPO DOCENTE da unidade (nome do professor no painel).
--  2. Números de USO. O gestor precisa de "quantas sessões esta semana", mas
--     `learning_events` é justamente o que professor/gestor NUNCA podem ler
--     linha a linha (0008/0009) — é quase tão revelador quanto a transcrição.
--     Solução: funções security-definer que devolvem SÓ AGREGADO, com o
--     escopo recalculado a partir de auth.uid() lá dentro. O gestor recebe
--     contagem; a linha de evidência nunca sai do banco.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Escolas alcançáveis pelo usuário logado (unidade direta ou via rede).
-- ----------------------------------------------------------------------------
create function accessible_school_ids()
returns table (school_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from schools s
  where exists (
    select 1 from staff_assignments sa
    where sa.profile_id = auth.uid()
      and (
        sa.school_id = s.id
        or sa.organization_id = s.organization_id
        or sa.class_id in (select sc.id from school_classes sc where sc.school_id = s.id)
      )
  );
$$;

grant execute on function accessible_school_ids() to authenticated;

-- ----------------------------------------------------------------------------
-- [1] Identidade do corpo docente dentro do escopo.
-- Policy ADICIONAL (policies de select são OR entre si) — não afrouxa nada do
-- que já existe; só permite ler o profile de quem tem staff_assignment numa
-- escola que o gestor alcança.
-- ----------------------------------------------------------------------------
create policy profiles_select_staff_peers on profiles
  for select using (
    exists (
      select 1 from staff_assignments sa
      left join school_classes sc on sc.id = sa.class_id
      where sa.profile_id = profiles.id
        and coalesce(sa.school_id, sc.school_id) in (select school_id from accessible_school_ids())
    )
  );

create policy staff_assignments_select_scoped on staff_assignments
  for select using (
    class_id in (select class_id from accessible_class_ids())
    or school_id in (select school_id from accessible_school_ids())
  );

-- ----------------------------------------------------------------------------
-- [2] Agregados de uso. Uma "sessão de estudo" = um par (aluno, dia) com pelo
-- menos uma evidência registrada. É a unidade que a coordenação entende, e
-- não expõe nada sobre O QUE o aluno estudou.
-- ----------------------------------------------------------------------------
create function school_overview()
returns table (
  active_students integer,
  linked_guardians integer,
  teachers integer,
  sessions_7d integer,
  students_active_7d integer
)
language sql
stable
security definer
set search_path = public
as $$
  with scope as (select school_id from accessible_school_ids()),
  scoped_students as (
    select distinct e.student_id
    from enrollments e
    join school_classes sc on sc.id = e.class_id
    where e.status = 'active' and sc.school_id in (select school_id from scope)
  )
  select
    (select count(*) from scoped_students)::integer,
    (select count(distinct l.parent_id) from parent_student_links l
      where l.status = 'active'
        and l.student_id in (select student_id from scoped_students))::integer,
    (select count(distinct sa.profile_id) from staff_assignments sa
      left join school_classes sc on sc.id = sa.class_id
      where coalesce(sa.school_id, sc.school_id) in (select school_id from scope))::integer,
    (select count(*) from (
      select distinct le.student_id, date_trunc('day', le.occurred_at)
      from learning_events le
      where le.student_id in (select student_id from scoped_students)
        and le.occurred_at >= now() - interval '7 days'
    ) s)::integer,
    (select count(distinct le.student_id) from learning_events le
      where le.student_id in (select student_id from scoped_students)
        and le.occurred_at >= now() - interval '7 days')::integer;
$$;

grant execute on function school_overview() to authenticated;

-- Série diária de sessões (últimos 14 dias) para o gráfico do dashboard.
create function school_daily_sessions(p_days integer default 14)
returns table (day date, sessions integer)
language sql
stable
security definer
set search_path = public
as $$
  with scope as (select school_id from accessible_school_ids()),
  scoped_students as (
    select distinct e.student_id
    from enrollments e
    join school_classes sc on sc.id = e.class_id
    where e.status = 'active' and sc.school_id in (select school_id from scope)
  ),
  days as (
    select generate_series(
      (current_date - (p_days - 1))::date, current_date, interval '1 day'
    )::date as day
  ),
  sess as (
    select distinct le.student_id, le.occurred_at::date as day
    from learning_events le
    where le.student_id in (select student_id from scoped_students)
      and le.occurred_at >= current_date - (p_days - 1)
  )
  select d.day, coalesce(count(s.student_id), 0)::integer
  from days d left join sess s on s.day = d.day
  group by d.day order by d.day;
$$;

grant execute on function school_daily_sessions(integer) to authenticated;

-- ----------------------------------------------------------------------------
-- Engajamento por professor (decisão #4): média de sessões por aluno nas
-- turmas dele, nos últimos 7 dias. Número absoluto, não porcentagem.
-- ----------------------------------------------------------------------------
create function teacher_engagement()
returns table (
  teacher_id uuid,
  teacher_name text,
  classes integer,
  students integer,
  sessions_7d integer,
  sessions_per_student numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with scope as (select school_id from accessible_school_ids()),
  staff as (
    select distinct sa.profile_id, sa.class_id, sa.school_id
    from staff_assignments sa
    left join school_classes sc on sc.id = sa.class_id
    where coalesce(sa.school_id, sc.school_id) in (select school_id from scope)
      and sa.class_id is not null
  ),
  per_teacher_students as (
    select st.profile_id, e.student_id
    from staff st
    join enrollments e on e.class_id = st.class_id and e.status = 'active'
    group by st.profile_id, e.student_id
  ),
  student_days as (
    select distinct pts.profile_id, le.student_id, le.occurred_at::date as day
    from per_teacher_students pts
    join learning_events le on le.student_id = pts.student_id
    where le.occurred_at >= now() - interval '7 days'
  ),
  sess as (
    select sd.profile_id, count(*)::integer as sessions
    from student_days sd
    group by sd.profile_id
  )
  select
    st.profile_id,
    coalesce(p.full_name, 'Professor'),
    count(distinct st.class_id)::integer,
    (select count(*)::integer from per_teacher_students x where x.profile_id = st.profile_id),
    coalesce((select sessions from sess where sess.profile_id = st.profile_id), 0),
    round(
      coalesce((select sessions from sess where sess.profile_id = st.profile_id), 0)::numeric
      / greatest((select count(*) from per_teacher_students x where x.profile_id = st.profile_id), 1),
      1
    )
  from staff st
  left join profiles p on p.id = st.profile_id
  group by st.profile_id, p.full_name;
$$;

grant execute on function teacher_engagement() to authenticated;

-- ----------------------------------------------------------------------------
-- Domínio médio por matéria na unidade + quantos alunos sustentam o número.
-- ----------------------------------------------------------------------------
create function subject_mastery_overview()
returns table (
  subject text,
  avg_mastery numeric,
  students integer,
  concepts_tracked integer
)
language sql
stable
security definer
set search_path = public
as $$
  with scope as (select school_id from accessible_school_ids()),
  scoped_students as (
    select distinct e.student_id
    from enrollments e
    join school_classes sc on sc.id = e.class_id
    where e.status = 'active' and sc.school_id in (select school_id from scope)
  )
  select
    c.subject,
    round(avg(cm.mastery)::numeric, 3),
    count(distinct cm.student_id)::integer,
    count(distinct cm.concept_id)::integer
  from concept_mastery cm
  join concepts c on c.id = cm.concept_id
  where cm.student_id in (select student_id from scoped_students)
    and cm.evidence_count > 0
  group by c.subject
  order by 2 asc;
$$;

grant execute on function subject_mastery_overview() to authenticated;

-- ----------------------------------------------------------------------------
-- Cobertura de responsáveis: quantos alunos têm responsável ativo vinculado.
-- É o funil que a rede usa para cobrar adesão da família.
-- ----------------------------------------------------------------------------
create function guardian_coverage()
returns table (
  students_total integer,
  students_with_guardian integer,
  students_without_guardian integer
)
language sql
stable
security definer
set search_path = public
as $$
  with scope as (select school_id from accessible_school_ids()),
  scoped_students as (
    select distinct e.student_id
    from enrollments e
    join school_classes sc on sc.id = e.class_id
    where e.status = 'active' and sc.school_id in (select school_id from scope)
  ),
  linked as (
    select distinct l.student_id from parent_student_links l
    where l.status = 'active' and l.student_id in (select student_id from scoped_students)
  )
  select
    (select count(*) from scoped_students)::integer,
    (select count(*) from linked)::integer,
    ((select count(*) from scoped_students) - (select count(*) from linked))::integer;
$$;

grant execute on function guardian_coverage() to authenticated;
