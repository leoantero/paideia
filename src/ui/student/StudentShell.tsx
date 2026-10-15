import Link from "next/link";
import type { ReactNode } from "react";
import { DrachmaCoin, FlameIcon, GearIcon } from "@/src/ui/paideia/icons";
import { Marca } from "@/src/ui/paideia/Marca";
import { Meander } from "@/src/ui/paideia/ornaments";
import { BottomNav } from "./BottomNav";

export interface ShellStats {
  coins: number;
  streak: number;
  activeToday: boolean;
}

/**
 * Casca do app do aluno, no tema grego (`.theme-greek`, app/globals.css).
 * O tema redefine os tokens de cor e fonte só dentro desta árvore, então as
 * telas compartilhadas (Ajustes, Tutor) herdam a paleta sem tocar nos apps de
 * responsável, professor e gestor.
 */
export function StudentShell({
  children,
  stats,
  basePath = "/student",
}: {
  children: ReactNode;
  stats: ShellStats | null;
  basePath?: string;
}) {
  return (
    <div className="theme-greek flex min-h-dvh flex-1 flex-col bg-marble text-ink">
      <Meander height={12} color="var(--terracotta)" className="opacity-80" />
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 pt-4">
        <Link href={basePath} className="flex items-center gap-2">
          <Marca variante="busto" size={30} title={null} className="text-ink" />
          <span className="font-display text-2xl tracking-[0.18em] text-ink">
            PAIDEIA
          </span>
          <span className="font-display text-sm text-terracotta" aria-hidden>
            παιδεία
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {stats && (
            <>
              <span
                className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-sm font-bold"
                title={
                  stats.activeToday
                    ? "Ofensiva garantida hoje"
                    : "Estude hoje para manter a ofensiva"
                }
              >
                <FlameIcon size={18} lit={stats.activeToday} />
                <span
                  className={
                    stats.activeToday ? "text-terracotta" : "text-ink-soft"
                  }
                >
                  {stats.streak}
                </span>
              </span>
              <span className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-sm font-bold text-gold-deep">
                <DrachmaCoin size={18} />
                {stats.coins}
              </span>
            </>
          )}
          <Link
            href={`${basePath}/ajustes`}
            aria-label="Ajustes"
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-ink-soft transition-colors hover:text-ink"
          >
            <GearIcon size={18} />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-32 pt-5">
        {children}
      </main>
      <BottomNav basePath={basePath} />
    </div>
  );
}
