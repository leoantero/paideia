import { createClient } from "@/src/lib/supabase/server";
import {
  getLinkedStudents,
  getPerformanceForStudents,
} from "@/src/features/user-profiles/parent-profile-service";
import { StudentPerformanceSection } from "@/src/ui/parent/PerformanceCard";
import { PageTitle } from "@/src/ui/AppShell";
import { Callout } from "@/src/ui/kit";

export default async function ParentDashboardPage() {
  const supabase = await createClient();

  const students = await getLinkedStudents(supabase);
  const records = await getPerformanceForStudents(
    supabase,
    students.map((s) => s.id)
  );

  return (
    <>
      <PageTitle>Painel</PageTitle>
      <p className="mb-4 text-sm text-muted">
        Força e tendência por matéria — atualizado após cada sessão de estudo.
      </p>

      {students.length === 0 ? (
        <Callout>
          Nenhuma criança vinculada ainda. O vínculo é feito pela escola, a
          partir do e-mail informado na matrícula.
        </Callout>
      ) : (
        <div className="flex flex-col gap-4">
          {students.map((student) => (
            <StudentPerformanceSection
              key={student.id}
              student={student}
              records={records.filter((r) => r.student_id === student.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
