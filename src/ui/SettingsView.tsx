import { createClient } from "@/src/lib/supabase/server";
import { ROLE_LABEL, type Role } from "@/src/core/auth/types";
import { ScreenBody, ScreenHeader } from "@/src/ui/AppShell";
import { Avatar } from "@/src/ui/kit";
import { SignOutButton } from "@/src/ui/SignOutButton";

/** Tela de Ajustes compartilhada. Cada perfil pode estender com blocos próprios. */
export async function SettingsView({ extra }: { extra?: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user?.id ?? "")
    .single();

  const name = profile?.full_name ?? "—";
  const roleLabel = ROLE_LABEL[(profile?.role as Role) ?? "student"] ?? profile?.role;

  return (
    <ScreenBody>
      <ScreenHeader title="Ajustes" />

      <div className="flex flex-col gap-4">
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-[18px]">
          <div className="flex items-center gap-3.5">
            <Avatar initial={name.charAt(0).toUpperCase()} size={52} tone="mist" />
            <div>
              <div className="font-display text-[17px] font-bold text-ink">{name}</div>
              <div className="text-[13px] text-muted">{roleLabel}</div>
            </div>
          </div>
        </div>

        {extra}

        <SignOutButton />
      </div>
    </ScreenBody>
  );
}
