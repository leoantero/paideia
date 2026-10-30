import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { SettingsView } from "@/src/ui/SettingsView";
import { Callout, InfoList } from "@/src/ui/kit";

export const dynamic = "force-dynamic";

const SUBJECT_LABELS: Record<string, string> = {
  math: "Matemática",
  language: "Português",
  physics: "Física",
  history: "História",
  biology: "Biologia",
  chemistry: "Química",
};

export default async function TeacherAjustesPage() {
  const { supabase, user } = await getVerifiedUser();

  // RLS escopa às turmas do professor (0009).
  const [{ data: classes }, { data: schools }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("school_classes")
        .select("id, name, academic_year")
        .order("name"),
      supabase.from("schools").select("name").limit(1),
      supabase
        .from("staff_assignments")
        .select("subject")
        .eq("profile_id", user?.id ?? ""),
    ]);

  const subjects = [
    ...new Set(
      (assignments ?? []).map((a) => a.subject as string).filter(Boolean)
    ),
  ];

  return (
    <SettingsView
      extra={
        <>
          <InfoList
            rows={[
              ...(schools?.[0]
                ? [{ label: "Escola", value: schools[0].name as string }]
                : []),
              ...(subjects.length > 0
                ? [
                    {
                      label: "Matéria",
                      value: subjects
                        .map((s) => SUBJECT_LABELS[s] ?? s)
                        .join(", "),
                    },
                  ]
                : []),
              ...((classes ?? []).length === 0
                ? [{ label: "Turmas", value: "Nenhuma atribuída" }]
                : (classes ?? []).map((c) => ({
                    label: c.name as string,
                    value: String(c.academic_year ?? ""),
                  }))),
            ]}
          />

          <Callout tone="cool">
            <strong>Privacidade:</strong> você vê o domínio agregado por
            conceito dos alunos das suas turmas, nunca as conversas deles com o
            tutor.
          </Callout>
        </>
      }
    />
  );
}
