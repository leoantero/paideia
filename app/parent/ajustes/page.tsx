import { createClient } from "@/src/lib/supabase/server";
import { getLinkedChildren } from "@/src/features/user-profiles/parent-profile-service";
import { GRADE_BAND_LABELS_PT } from "@/src/core/auth/types";
import { SettingsView } from "@/src/ui/SettingsView";

export default async function ParentAjustesPage() {
  const supabase = await createClient();
  const children = await getLinkedChildren(supabase);
  const school = children.find((c) => c.school_name)?.school_name;

  return (
    <SettingsView
      extra={
        <>
          <div className="rounded-[12px] border border-line bg-surface px-[18px] py-3.5">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
              Filhos vinculados
            </div>
            {children.length === 0 ? (
              <p className="py-1 text-sm text-muted">
                Nenhum filho vinculado ainda.
              </p>
            ) : (
              children.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border-t border-bg py-2 first:border-t-0"
                >
                  <span className="text-sm font-medium text-ink">
                    {c.full_name}
                  </span>
                  <span className="text-[13px] text-muted">
                    {c.grade_level ? GRADE_BAND_LABELS_PT[c.grade_level] : "—"}
                  </span>
                </div>
              ))
            )}
          </div>

          {school && (
            <div className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-[18px] py-3.5">
              <span className="text-[13px] text-muted">Escola</span>
              <span className="text-sm font-medium text-ink">{school}</span>
            </div>
          )}

          <div className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-[18px] py-3.5">
            <span className="text-[13px] text-muted">Notificações</span>
            <span className="text-sm font-medium text-ink">Ativadas</span>
          </div>
        </>
      }
    />
  );
}
