import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { STUDENT_EMAIL_DOMAIN } from "@/src/core/auth/types";
import { GRADE_BAND_LABELS_PT } from "@/src/core/auth/types";
import { SettingsView } from "@/src/ui/SettingsView";
import { getGamificationState } from "@/src/features/gamification/activity-service";

const WHATSAPP =
  "https://wa.me/5531996829255?text=" +
  encodeURIComponent("Olá! Preciso de ajuda com o app Paideia.");

export default async function AjustesPage() {
  const { supabase, user } = await getVerifiedUser();

  const { data: student } = await supabase
    .from("students")
    .select("grade_level, school_name")
    .eq("id", user?.id ?? "")
    .single();

  const coins = user
    ? (await getGamificationState(supabase, user.id)).coins
    : 0;

  const matricula = user?.email?.endsWith(`@${STUDENT_EMAIL_DOMAIN}`)
    ? user.email.split("@")[0]
    : null;
  const grade = student?.grade_level
    ? GRADE_BAND_LABELS_PT[
        student.grade_level as keyof typeof GRADE_BAND_LABELS_PT
      ]
    : null;

  const rows = [
    student?.school_name && { label: "Escola", value: student.school_name },
    grade && { label: "Série", value: grade },
    matricula && { label: "Matrícula", value: matricula },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <SettingsView
      extra={
        <>
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-line bg-surface px-[18px] py-3.5">
            <span className="text-[13px] text-muted">Moedas acumuladas</span>
            <span className="text-[15px] font-bold text-gold-deep">
              🪙 {coins}
            </span>
          </div>

          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-[18px] py-3.5"
            >
              <span className="text-[13px] text-muted">{r.label}</span>
              <span className="text-sm font-medium text-ink">{r.value}</span>
            </div>
          ))}

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
              Ajuda e suporte
            </p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-strong/40 bg-strong-bg px-[18px] py-3.5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#25D366] text-white">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.825 9.825 0 016.988 2.898 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884M20.463 3.488A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
                </svg>
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">
                  Falar com suporte
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Atendimento rápido pelo WhatsApp
                </span>
              </span>
            </a>
          </div>
        </>
      }
    />
  );
}
