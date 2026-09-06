import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { ROLE_HOME, type Role } from "@/src/core/auth/types";
import { ContrastDemo } from "@/src/ui/ContrastDemo";

const ROLES: { href: string; label: string; blurb: string }[] = [
  { href: "/entrar/aluno", label: "Sou aluno", blurb: "Entrar com a matrícula" },
  { href: "/entrar/responsavel", label: "Sou responsável", blurb: "Acompanhar meu filho" },
  { href: "/entrar/professor", label: "Sou professor", blurb: "Ver a turma" },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const home = ROLE_HOME[profile?.role as Role];
    if (home) redirect(home);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
      <ContrastDemo />

      {/* linha grossa separando a demonstração da entrada */}
      <div className="h-1 rounded-full bg-ink" />

      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-lg font-semibold text-gold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Π
          </span>
          <span
            className="text-2xl font-semibold text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Paideia
          </span>
          <span
            aria-hidden
            className="ml-auto select-none text-5xl font-semibold text-gold/40"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ?
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {ROLES.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="flex items-center justify-between rounded-[var(--radius)] border border-line bg-surface p-4 transition-colors hover:border-ink"
            >
              <span>
                <span className="block text-sm font-semibold text-ink">{r.label}</span>
                <span className="block text-xs text-muted">{r.blurb}</span>
              </span>
              <span aria-hidden className="text-ink">→</span>
            </Link>
          ))}
          <p className="mt-1 text-center text-xs text-muted">
            Coordenação e direção — em breve
          </p>
        </div>
      </div>
    </main>
  );
}
