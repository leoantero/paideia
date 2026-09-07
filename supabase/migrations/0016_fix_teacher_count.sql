-- Correção: school_overview() contava como "professor" qualquer perfil com
-- staff_assignment na unidade — inclusive o próprio gestor, que tem um
-- assignment de escola. Na demo isso aparecia como "2 professores" com uma
-- única professora cadastrada.
--
-- Um KPI errado num painel de gestão é pior que um KPI ausente: destrói a
-- confiança em todos os outros números da tela. Agora o filtro é pelo papel.
create or replace function school_overview()
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
      join profiles p on p.id = sa.profile_id
      left join school_classes sc on sc.id = sa.class_id
      where coalesce(sa.school_id, sc.school_id) in (select school_id from scope)
        and p.role = 'teacher')::integer,
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
