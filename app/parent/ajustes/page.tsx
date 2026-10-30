import { createClient } from "@/src/lib/supabase/server";
import { getLinkedChildren } from "@/src/features/user-profiles/parent-profile-service";
import { GRADE_BAND_LABELS_PT } from "@/src/core/auth/types";
import { SettingsView } from "@/src/ui/SettingsView";
import { InfoList } from "@/src/ui/kit";

export default async function ParentAjustesPage() {
  const supabase = await createClient();
  const children = await getLinkedChildren(supabase);
  const school = children.find((c) => c.school_name)?.school_name;

  return (
    <SettingsView
      extra={
        <>
          <InfoList
            rows={[
              {
                label: "Filhos vinculados",
                value:
                  children.length === 0
                    ? "Nenhum ainda"
                    : children
                        .map((c) => (c.full_name ?? "").split(" ")[0])
                        .join(", "),
              },
              ...children.map((c) => ({
                label: c.full_name ?? "Aluno",
                value: c.grade_level
                  ? GRADE_BAND_LABELS_PT[c.grade_level]
                  : "—",
              })),
              ...(school ? [{ label: "Escola", value: school }] : []),
            ]}
          />
          <p className="text-[13px] leading-normal text-muted">
            O vínculo com os filhos é feito pela escola, a partir do e-mail
            informado na matrícula.
          </p>
        </>
      }
    />
  );
}
