import type { ReactNode } from "react";
import { BottomNav, type NavItem } from "@/src/ui/BottomNav";

/**
 * Casca dos apps logados: coluna com largura de celular, centralizada no
 * desktop, com a navegação inferior fixa. Cada página renderiza o próprio
 * cabeçalho (via <PageTitle/>).
 */
export function AppShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col border-x border-line bg-bg">
      <div className="flex flex-1 flex-col px-5 py-5">{children}</div>
      <BottomNav items={nav} />
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <h1 className="text-xl font-semibold">{children}</h1>
      <span
        aria-hidden
        className="ml-auto select-none text-2xl font-semibold text-gold/30"
        style={{ fontFamily: "var(--font-display)" }}
      >
        ?
      </span>
    </div>
  );
}
