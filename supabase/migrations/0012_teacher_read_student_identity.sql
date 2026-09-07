-- Identidade do aluno para o professor: sem isso o heatmap da turma não tem
-- como rotular as linhas (nem com "Ana B." — precisa do full_name pra
-- derivar isso). Escopo idêntico ao de concept_mastery_select_staff em
-- 0009_tenancy_networks.sql: só alunos com enrollment ativo numa turma
-- alcançável pelo professor/coordenação/direção (accessible_class_ids()).
-- Ver docs/REDESIGN_PLAN.md §7 "Identidade p/ professor".
create policy students_select_staff on students
  for select using (
    exists (
      select 1 from enrollments e
      where e.student_id = students.id
        and e.status = 'active'
        and e.class_id in (select class_id from accessible_class_ids())
    )
  );

create policy profiles_select_staff on profiles
  for select using (
    exists (
      select 1 from enrollments e
      where e.student_id = profiles.id
        and e.status = 'active'
        and e.class_id in (select class_id from accessible_class_ids())
    )
  );
