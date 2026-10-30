import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { ROLE_LABEL, type Role } from "@/src/core/auth/types";
import { ScreenBody } from "@/src/ui/AppShell";
import { SignOutButton } from "@/src/ui/SignOutButton";

/**
 * Tela de Ajustes compartilhada (prancha `Ajustes`). Cada perfil acrescenta
 * os próprios blocos em `extra`. `padded={false}` quando a casca já dá o
 * respiro lateral (app do aluno).
 */
export async function SettingsView({
  extra,
  padded = true,
}: {
  extra?: React.ReactNode;
  padded?: boolean;
}) {
  const { supabase, user } = await getVerifiedUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user?.id ?? "")
    .single();

  const name = profile?.full_name ?? "—";
  const roleLabel =
    ROLE_LABEL[(profile?.role as Role) ?? "student"] ?? profile?.role;

  const body = (
    <div className="flex flex-col gap-[18px]">
      <h1 className="text-[28px] leading-tight">Ajustes</h1>

      <div className="flex items-center gap-3.5 rounded-lg bg-surface px-[18px] py-4">
        <span
          aria-hidden
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-lavender font-display text-2xl text-lavender-ink"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-[17px] font-extrabold">{name}</span>
          <span className="text-[13px] text-muted">{roleLabel}</span>
        </div>
      </div>

      {extra}

      <SignOutButton />
    </div>
  );

  return padded ? <ScreenBody>{body}</ScreenBody> : body;
}
