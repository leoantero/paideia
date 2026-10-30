import Link from "next/link";
import type { ReactNode } from "react";
import {
  CoinDot,
  FlameLineIcon,
  GearLineIcon,
} from "@/src/ui/paideia/line-icons";
import { BottomNav } from "./BottomNav";

export interface ShellStats {
  coins: number;
  streak: number;
  activeToday: boolean;
}

/**
 * Casca do app do aluno (pranchas `Topo` + `Nav` do redesign Glaukópis):
 * logotipo, ofensiva, dracmas e Ajustes no topo; barra de abas embaixo.
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
    <div className="flex min-h-dvh flex-1 flex-col bg-bg text-ink">
      <header className="mx-auto flex h-[60px] w-full max-w-xl shrink-0 items-center justify-between px-5">
        <Link href={basePath} className="flex items-baseline gap-2">
          <span className="font-mark text-[22px] tracking-[0.16em]">
            PAIDEIA
          </span>
          <span className="font-mark text-[13px] text-glauco-deep" aria-hidden>
            παιδεία
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm font-bold tabular-nums">
          {stats && (
            <>
              <span
                className={`flex items-center gap-1 ${
                  stats.activeToday ? "text-coral-ink" : "text-muted"
                }`}
                title={
                  stats.activeToday
                    ? "Ofensiva garantida hoje"
                    : "Ofensiva: estude hoje para manter"
                }
              >
                <FlameLineIcon size={18} />
                {stats.streak}
                <span className="sr-only">
                  {stats.streak === 1 ? " dia" : " dias"} de ofensiva
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-lamp-ink">
                <CoinDot size={15} />
                {stats.coins}
                <span className="sr-only"> dracmas</span>
              </span>
            </>
          )}
          <Link
            href={`${basePath}/ajustes`}
            aria-label="Ajustes"
            className="-mr-2.5 grid h-11 w-10 place-items-center text-muted transition-colors hover:text-ink"
          >
            <GearLineIcon size={21} />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-28 pt-2">
        {children}
      </main>
      <BottomNav basePath={basePath} />
    </div>
  );
}
