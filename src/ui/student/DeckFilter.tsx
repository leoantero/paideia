import Link from "next/link";
import type { DeckOverview } from "@/src/features/spaced-repetition/types";
import { subjectStyle } from "./subject-style";

/**
 * Chips para revisar tudo ou um baralho só. Não está na prancha `TelaRevisao`,
 * então fica no fim da tela, discreto, sem disputar com o card.
 */
export function DeckFilter({
  decks,
  activeDeckId,
  basePath,
}: {
  decks: DeckOverview[];
  activeDeckId: string | null;
  basePath: string;
}) {
  if (decks.length === 0) return null;
  const chip = (active: boolean) =>
    `flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold ${
      active
        ? "bg-night text-on-night"
        : "bg-surface text-muted ring-1 ring-line-strong hover:text-ink"
    }`;

  return (
    <nav aria-label="Baralhos" className="flex flex-col gap-2">
      <h2 className="font-sans text-[13px] font-bold text-muted">
        Revisar um baralho só
      </h2>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <Link
          href={`${basePath}/revisao`}
          className={chip(activeDeckId === null)}
        >
          Tudo
        </Link>
        {decks.map((deck) => {
          const active = activeDeckId === deck.id;
          const style = subjectStyle(deck.subject);
          return (
            <Link
              key={deck.id}
              href={`${basePath}/revisao?deck=${deck.id}`}
              className={chip(active)}
            >
              <span
                className="font-mark"
                style={{ color: active ? undefined : style.color }}
              >
                {style.glyph}
              </span>
              {deck.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
