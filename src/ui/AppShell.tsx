import type { ReactNode } from "react";
import { BottomNav, type NavItem } from "@/src/ui/BottomNav";

/**
 * Casca dos apps logados (padrão do Figma): coluna de 420px centralizada,
 * área de conteúdo que rola, e a barra de navegação inferior fixa. Cada tela
 * cuida do próprio cabeçalho e do próprio padding.
 */
export function AppShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[420px] flex-col border-x border-line bg-bg">
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav items={nav} />
    </div>
  );
}

/**
 * Cabeçalho padrão de tela interna: título em Bricolage extrabold + subtítulo.
 * (O "?" da marca só aparece na entrada/login/home do tutor, não aqui.)
 */
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
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Padding padrão de uma tela que rola (equivale ao `padding: 20px` do Figma). */
export function ScreenBody({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-col p-5">{children}</div>;
}

/**
 * @deprecated Shim de compatibilidade durante a migração para o design do
 * Figma. Telas novas usam <ScreenBody> + <ScreenHeader>. Remover quando todas
 * as telas antigas tiverem sido reescritas.
 */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <div className="p-5">
      <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">
        {children}
      </h1>
    </div>
  );
}
