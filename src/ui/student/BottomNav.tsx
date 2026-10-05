"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  ArenaSplitIcon,
  OwlIcon,
  TabletsIcon,
  TempleIcon,
} from "@/src/ui/paideia/icons";

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}

export function BottomNav({ basePath = "/student" }: { basePath?: string }) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: basePath, label: "Início", Icon: TempleIcon },
    { href: `${basePath}/revisao`, label: "Revisar", Icon: TabletsIcon },
    { href: `${basePath}/tutor`, label: "Tutor", Icon: OwlIcon },
    { href: `${basePath}/podio`, label: "Pódio · Loja", Icon: ArenaSplitIcon },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <ul className="flex w-full max-w-md items-stretch justify-between gap-1 rounded-[22px] border border-ink/10 bg-ink p-1.5 shadow-[0_12px_32px_-12px_rgba(31,26,22,0.55)]">
        {items.map(({ href, label, Icon }) => {
          const active =
            href === basePath ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[11px] font-semibold tracking-wide transition-colors ${
                  active
                    ? "bg-terracotta text-marble"
                    : "text-marble/70 hover:bg-marble/10 hover:text-marble"
                }`}
              >
                <Icon size={24} />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
