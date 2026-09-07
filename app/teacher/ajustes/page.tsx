import { createClient } from "@/src/lib/supabase/server";
import { SettingsView } from "@/src/ui/SettingsView";
import { Callout } from "@/src/ui/kit";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
          {schools?.[0] && (
            <div className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-[18px] py-3.5">
              <span className="text-[13px] text-muted">Escola</span>
              <span className="text-sm font-medium text-ink">
                {schools[0].name}
              </span>
            </div>
          )}

          {subjects.length > 0 && (
            <div className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-[18px] py-3.5">
              <span className="text-[13px] text-muted">Matéria</span>
              <span className="text-sm font-medium text-ink">
                {subjects.map((s) => SUBJECT_LABELS[s] ?? s).join(", ")}
              </span>
            </div>
          )}

          <div className="rounded-[12px] border border-line bg-surface px-[18px] py-3.5">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
              Turmas
            </div>
            {(classes ?? []).length === 0 ? (
              <p className="py-1 text-sm text-muted">
                Nenhuma turma atribuída.
              </p>
            ) : (
              (classes ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border-t border-bg py-2 first:border-t-0"
                >
                  <span className="text-sm font-medium text-ink">{c.name}</span>
                  <span className="text-[13px] text-muted">
                    {c.academic_year}
                  </span>
                </div>
              ))
            )}
          </div>

          <Callout tone="warm">
            <strong>Privacidade:</strong> você vê domínio agregado por conceito
            dos alunos das suas turmas — nunca as conversas deles com o Tutor.
          </Callout>
        </>
      }
    />
  );
}
