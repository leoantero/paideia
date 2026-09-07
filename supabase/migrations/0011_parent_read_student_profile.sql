-- Permite ao responsável ler full_name/role do(s) filho(s) vinculados.
-- Sem isso o Painel não tem como exibir o nome da criança: `students` só
-- guarda grade_level/school_name, o nome mora em `profiles`
-- (profiles_select_own hoje só libera a própria linha). `profiles` não tem
-- nenhum campo sensível além de full_name/role, então a policy libera a
-- linha inteira em vez de precisar de uma view. Ver docs/REDESIGN_PLAN.md §4.
create policy profiles_select_linked_parent on profiles
  for select using (
    exists (
      select 1 from parent_student_links l
      where l.student_id = profiles.id
        and l.parent_id = auth.uid()
        and l.status = 'active'
    )
  );
