import type { ReactNode } from "react";
import { BottomNav, type NavItem } from "@/src/ui/BottomNav";

/**
 * Casca dos apps logados dos adultos: coluna de 420px centralizada,
 * área de conteúdo que rola, e a barra de navegação inferior fixa. Cada tela
 * cuida do próprio cabeçalho e do próprio padding.
 */
export function AppShell({
  nav,
  label,
  children,
}: {
  nav: NavItem[];
  /** Perfil ao lado do logotipo: "Família", "Professor", "Gestão". */
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[420px] flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center px-5">
        <span className="flex items-baseline gap-2">
          <span className="font-mark text-xl tracking-[0.16em]">PAIDEIA</span>
          <span className="text-xs font-semibold text-muted">{label}</span>
        </span>
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav items={nav} />
    </div>
  );
}

/** Cabeçalho padrão de tela interna: título em Young Serif + subtítulo. */
export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm leading-[1.45] text-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Padding padrão de uma tela que rola. */
export function ScreenBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col px-5 pb-6 pt-1.5">{children}</div>
  );
}

/**
 * @deprecated Shim de compatibilidade durante a migração para o design do
 * Figma. Telas novas usam <ScreenBody> + <ScreenHeader>. Remover quando todas
 * as telas antigas tiverem sido reescritas.
 */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <div className="p-5">
      <h1 className="text-[28px] leading-tight">{children}</h1>
    </div>
  );
}
