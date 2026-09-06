import { createClient } from "@/src/lib/supabase/server";
import { Card } from "@/src/ui/kit";
import { PageTitle } from "@/src/ui/AppShell";
import { SignOutButton } from "@/src/ui/SignOutButton";

const ROLE_LABEL: Record<string, string> = {
  student: "Aluno",
  parent: "Responsável",
  teacher: "Professor",
};

/** Tela de Ajustes compartilhada pelos três perfis. */
export async function SettingsView() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user?.id ?? "")
    .single();

  return (
    <>
      <PageTitle>Ajustes</PageTitle>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Nome</p>
            <p className="text-sm text-body">{profile?.full_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Perfil</p>
            <p className="text-sm text-body">
              {ROLE_LABEL[profile?.role ?? ""] ?? profile?.role}
            </p>
          </div>
        </Card>
        <SignOutButton />
      </div>
    </>
  );
}
