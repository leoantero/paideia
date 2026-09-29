import Link from "next/link";
import type { ReactNode } from "react";
import { DrachmaCoin, FlameIcon } from "@/src/ui/paideia/icons";
import { Meander } from "@/src/ui/paideia/ornaments";
import { BottomNav } from "./BottomNav";

export interface ShellStats {
  coins: number;
  streak: number;
  activeToday: boolean;
}

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
    <div className="flex min-h-full flex-1 flex-col bg-marble text-ink">
      <Meander height={12} color="var(--terracotta)" className="opacity-80" />
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 pt-4">
        <Link href={basePath} className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-[0.18em] text-ink">PAIDEIA</span>
          <span className="font-display text-sm text-terracotta" aria-hidden>
            παιδεία
          </span>
        </Link>
        {stats && (
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-sm font-bold"
              title={stats.activeToday ? "Ofensiva garantida hoje" : "Estude hoje para manter a ofensiva"}
            >
              <FlameIcon size={18} lit={stats.activeToday} />
              <span className={stats.activeToday ? "text-terracotta" : "text-ink-soft"}>{stats.streak}</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-sm font-bold text-gold-deep">
              <DrachmaCoin size={18} />
              {stats.coins}
            </span>
          </div>
        )}
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-32 pt-5">{children}</main>
      <BottomNav basePath={basePath} />
    </div>
  );
}
