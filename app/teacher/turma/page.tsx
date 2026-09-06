import { PageTitle } from "@/src/ui/AppShell";
import { Callout, Card } from "@/src/ui/kit";
import { createClient } from "@/src/lib/supabase/server";

export default async function TeacherTurmaPage() {
  const supabase = await createClient();

  // RLS (school_classes_select_scoped) já filtra para as turmas do professor.
  const { data: classes } = await supabase
    .from("school_classes")
    .select("id, name, grade_year, academic_year");

  return (
    <>
      <PageTitle>Turma</PageTitle>
      <div className="flex flex-col gap-4">
        {(classes ?? []).map((c) => (
          <Card key={c.id} className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{c.name}</span>
            <span className="text-xs text-muted">{c.academic_year}</span>
          </Card>
        ))}
        <Callout>
          O mapa de calor turma × conceito e o diagnóstico de pré-requisito por
          aluno entram aqui, assim que houver evidência de aprendizagem
          registrada. Em construção.
        </Callout>
      </div>
    </>
  );
}
