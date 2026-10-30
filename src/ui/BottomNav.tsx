"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

/**
 * Barra inferior dos adultos (prancha `NavPerfil`): ícone de traço de 23px,
 * rótulo 11px e um filete "noite" no topo do item ativo. Fica fixa no rodapé
 * da coluna centralizada.
 */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 flex h-[72px] shrink-0 border-t border-line-strong bg-surface px-3 pb-2">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-[3px] text-[11px] ${
              active
                ? "font-extrabold text-ink"
                : "font-semibold text-faint hover:text-ink"
            }`}
          >
            <span
              aria-hidden
              className={`mb-[7px] h-[3px] w-[22px] rounded-b-sm ${
                active ? "bg-night" : "bg-transparent"
              }`}
            />
            <span aria-hidden className="[&>svg]:h-[23px] [&>svg]:w-[23px]">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const S = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

const path = (d: string) => (
  <svg {...S}>
    <path d={d} />
  </svg>
);

/* Ícones de traço das pranchas (design/redesign-glaukopis/telas/NavPerfil). */
export const icons = {
  chat: path(
    "M4 5.5h16v10H9l-4.5 4v-4H4zM8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"
  ),
  cards: path(
    "M4 5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5v12a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 4 17.5zM14 7h4.5A1.5 1.5 0 0 1 20 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5V19M7 8h4M7 11h4"
  ),
  gear: path(
    "M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
  ),
  dashboard: path(
    "M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z"
  ),
  advisor: path(
    "M3 13c2.5 3 6 4 9.5 4H17c2 0 3.5-1.5 3.5-3.5 0-.8-.6-1.5-1.5-1.5H12C9 12 5.5 11 3 13zM12.5 12V9.5M12.5 9.5c-1.2-1-1.2-3 0-5 1.2 2 1.2 4 0 5zM9 20.5h7"
  ),
  heat: path(
    "M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7M2.5 20c.6-3.6 3.3-6 6.5-6s5.9 2.4 6.5 6M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.5c1.6.8 2.7 3 3 5.5"
  ),
  build: path(
    "M9 4.5H6.5A1.5 1.5 0 0 0 5 6v13.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H15M9 3.5h6v3H9zM9 13l2 2 4-4"
  ),
  insights: path("M4 5.5h16v10H9l-4.5 4v-4H4zM12 8v4.5M9.75 10.25h4.5"),
  bars: path("M3.5 20.5h17M6 17v-6M10.5 17V6M15 17V8M19.5 17v-4"),
  store: path(
    "M3 9l1.5-5h15L21 9M3 9v10a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M9 13a3 3 0 006 0"
  ),
};
