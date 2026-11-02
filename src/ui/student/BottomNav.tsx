"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  CardsIcon,
  CupIcon,
  OwlLineIcon,
  PedimentIcon,
  QuestionsIcon,
  SimulationIcon,
} from "@/src/ui/paideia/line-icons";

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}

/** Barra inferior do aluno (prancha `Nav`): as 6 abas da prancha. */
export function BottomNav({ basePath = "/student" }: { basePath?: string }) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: basePath, label: "Início", Icon: PedimentIcon },
    { href: `${basePath}/tutor`, label: "Tutor", Icon: OwlLineIcon },
    { href: `${basePath}/revisao`, label: "Revisar", Icon: CardsIcon },
    { href: `${basePath}/questoes`, label: "Questões", Icon: QuestionsIcon },
    {
      href: `${basePath}/simulacoes`,
      label: "Simulação",
      Icon: SimulationIcon,
    },
    { href: `${basePath}/podio`, label: "Pódio", Icon: CupIcon },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-[72px] w-full max-w-xl px-1 pb-2">
        {items.map(({ href, label, Icon }) => {
          const active =
            href === basePath ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center gap-[3px] text-[10.5px] ${
                  active
                    ? "font-extrabold text-ink"
                    : "font-semibold text-faint hover:text-ink"
                }`}
              >
                <span
                  className={`mb-[7px] h-[3px] w-[22px] rounded-b-sm ${
                    active ? "bg-night" : "bg-transparent"
                  }`}
                />
                <Icon size={23} />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
