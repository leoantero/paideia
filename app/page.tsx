import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { ROLE_HOME, type Role } from "@/src/core/auth/types";
import { isDevPanelEnabled } from "@/src/features/dev/dev-access";
import { Marca } from "@/src/ui/paideia/Marca";
import { ChevronRightIcon, OwlLineIcon } from "@/src/ui/paideia/line-icons";

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
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col">
      {/* Herói (prancha `Entrada`) */}
      <section className="flex flex-col gap-3.5 rounded-b-[24px] bg-panel px-6 pb-7 pt-[26px] text-on-panel">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <Marca
              variante="busto"
              peso="compacta"
              size={36}
              linha="#f3f2ee"
              louro="#f2c768"
              title={null}
            />
            <span className="font-mark text-xl tracking-[0.16em]">PAIDEIA</span>
            <span className="font-mark text-[13px] text-glauco" aria-hidden>
              παιδεία
            </span>
          </span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-glauco text-on-glauco">
            <OwlLineIcon size={24} strokeWidth={1.7} />
          </span>
        </div>
        <h1 className="mt-[26px] text-[34px] leading-[1.12] text-on-panel">
          A IA que ensina a pensar.
        </h1>
        <p className="text-[15px] leading-normal text-panel-muted">
          Conduzimos o aluno por perguntas até ele chegar sozinho à conclusão.
        </p>
        <div className="mt-1.5 flex flex-col overflow-hidden rounded-[12px]">
          <div className="flex flex-col gap-1 bg-white/10 px-4 py-3">
            <span className="text-xs font-bold text-panel-muted">
              IA genérica
            </span>
            <span className="text-sm text-on-panel/80">
              &ldquo;Restaram 12 pães.&rdquo;
            </span>
          </div>
          <div className="flex flex-col gap-1 bg-lamp px-4 py-3 text-on-lamp">
            <span className="text-xs font-extrabold text-on-lamp-accent">
              Paideia
            </span>
            <span className="text-sm font-semibold">
              &ldquo;Se vendeu 3/5 dos 120 pães de manhã, quantos foram?&rdquo;
            </span>
          </div>
        </div>
      </section>

      {/* Perfis */}
      <nav
        aria-label="Entrar como"
        className="flex flex-col gap-2.5 px-5 pt-[26px]"
      >
        <RoleLink role={ROLES[0]} primary />
        <div className="flex flex-col rounded-lg bg-surface">
          {ROLES.slice(1).map((r, i) => (
            <RoleLink key={r.href} role={r} divider={i > 0} />
          ))}
        </div>

        {/* Atalho de demonstração: some quando PAIDEIA_DEV_PANEL não está ligado. */}
        {isDevPanelEnabled() && (
          <Link
            href="/dev"
            className="mt-2.5 flex items-center gap-3.5 rounded-lg border-[1.5px] border-dashed border-input px-[18px] py-3.5 hover:border-night"
          >
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="rounded bg-coral px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-on-coral">
                  Para devs
                </span>
                <span className="text-[15px] font-extrabold">
                  Entrar como qualquer perfil
                </span>
              </span>
              <span className="text-[13px] text-muted">
                Ver os quatro apps sem trocar de conta na mão
              </span>
            </span>
            <ChevronRightIcon size={20} />
          </Link>
        )}
      </nav>

      <p className="mt-auto p-6 text-center text-xs text-muted">
        Educação com IA que respeita a privacidade · LGPD
      </p>
    </main>
  );
}

function RoleLink({
  role,
  primary = false,
  divider = false,
}: {
  role: (typeof ROLES)[number];
  primary?: boolean;
  divider?: boolean;
}) {
  return (
    <Link
      href={role.href}
      className={`flex items-center gap-3.5 px-[18px] ${
        primary
          ? "rounded-lg bg-night py-4 text-on-night"
          : `py-[15px] ${divider ? "border-t border-line" : ""}`
      }`}
    >
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-base font-extrabold">{role.label}</span>
        <span
          className={`text-[13px] ${primary ? "opacity-75" : "text-muted"}`}
        >
          {role.desc}
        </span>
      </span>
      <ChevronRightIcon size={20} />
    </Link>
  );
}
