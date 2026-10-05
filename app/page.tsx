import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { ROLE_HOME, type Role } from "@/src/core/auth/types";
import { isDevPanelEnabled } from "@/src/features/dev/dev-access";

const ROLES: { href: string; label: string; desc: string }[] = [
  {
    href: "/entrar/aluno",
    label: "Sou aluno",
    desc: "Aprenda pensando, não copiando",
  },
  {
    href: "/entrar/responsavel",
    label: "Sou responsável",
    desc: "Acompanhe o progresso do seu filho",
  },
  {
    href: "/entrar/professor",
    label: "Sou professor",
    desc: "Gerencie suas turmas e questões",
  },
  {
    href: "/entrar/gestor",
    label: "Sou gestor",
    desc: "Visão completa da escola",
  },
];

export default async function Home() {
  const { supabase, user } = await getVerifiedUser();

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
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-6">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-12">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-ink font-display text-[22px] font-extrabold leading-none text-white"
          >
            Π
          </span>
          <span className="font-display text-[22px] font-bold tracking-tight text-ink">
            Paideia
          </span>
        </div>
        <span
          aria-hidden
          className="font-display text-[26px] font-bold text-gold"
        >
          ?
        </span>
      </div>

      {/* Hero */}
      <div className="pt-11">
        <h1 className="font-display text-[34px] font-extrabold leading-[1.15] tracking-tight text-ink">
          A IA que ensina
          <br />a <span className="italic">pensar</span>.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Conduzimos o aluno por perguntas até ele chegar sozinho à conclusão.
        </p>

        {/* Cena de contraste */}
        <div className="mt-6 overflow-hidden rounded-[14px] border-[1.5px] border-mist">
          <div className="border-b border-line bg-surface px-[18px] py-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              IA genérica
            </span>
            <p className="mt-1.5 text-[14px] leading-snug text-muted">
              &ldquo;Restaram 12 pães.&rdquo; ✓
            </p>
          </div>
          <div className="bg-parchment px-[18px] py-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gold-deep">
              Paideia
            </span>
            <p className="mt-1.5 text-[14px] font-medium leading-snug text-ink">
              &ldquo;Se vendeu 3/5 dos 120 pães de manhã, quantos foram?&rdquo;
              🤔
            </p>
          </div>
        </div>
      </div>

      {/* Perfis */}
      <div className="mt-9 flex flex-col gap-2.5">
        {ROLES.map((r, i) => (
          <Link
            key={r.href}
            href={r.href}
            className={`flex items-center justify-between rounded-[14px] border-2 px-5 py-4 transition-colors ${
              i === 0
                ? "border-ink bg-ink text-white"
                : "border-mist bg-surface text-ink hover:border-ink"
            }`}
          >
            <span>
              <span className="block font-display text-[16px] font-bold tracking-tight">
                {r.label}
              </span>
              <span className="mt-0.5 block text-[13px] opacity-70">
                {r.desc}
              </span>
            </span>
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        ))}
      </div>

      {/* Atalho de demonstração — some quando PAIDEIA_DEV_PANEL não está ligado. */}
      {isDevPanelEnabled() && (
        <Link
          href="/dev"
          className="mt-5 flex items-center justify-between rounded-[14px] border-[1.5px] border-dashed border-faint/60 bg-surface px-5 py-3.5 transition-colors hover:border-ink"
        >
          <span>
            <span className="flex items-center gap-2">
              <span className="rounded bg-weak px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-white">
                Para devs
              </span>
              <span className="font-display text-[15px] font-bold tracking-tight text-ink">
                Entrar como qualquer perfil
              </span>
            </span>
            <span className="mt-1 block text-[13px] text-muted">
              Ver os quatro apps sem trocar de conta na mão
            </span>
          </span>
          <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            className="shrink-0 text-ink"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      )}

      <div className="mt-auto py-8 text-center">
        <p className="text-xs text-faint">
          Educação com IA que respeita a privacidade · LGPD
        </p>
      </div>
    </main>
  );
}
