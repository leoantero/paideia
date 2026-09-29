import Link from "next/link";
import type { DeckOverview } from "@/src/features/spaced-repetition/types";
import { SUBJECT_STYLE } from "./subject-style";

/** Horizontal chips to study everything or one deck. */
export function DeckFilter({
  decks,
  activeDeckId,
  basePath,
}: {
  decks: DeckOverview[];
  activeDeckId: string | null;
  basePath: string;
}) {
  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors ${
      active ? "border-ink bg-ink text-marble" : "border-line bg-surface text-ink-soft hover:text-ink"
    }`;

  return (
    <nav aria-label="Baralhos" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      <Link href={`${basePath}/study`} className={chip(activeDeckId === null)}>
        Tudo
      </Link>
      {decks.map((deck) => (
        <Link key={deck.id} href={`${basePath}/study?deck=${deck.id}`} className={chip(activeDeckId === deck.id)}>
          <span className="font-display" style={{ color: activeDeckId === deck.id ? undefined : SUBJECT_STYLE[deck.subject].color }}>
            {SUBJECT_STYLE[deck.subject].glyph}
          </span>
          {deck.title}
        </Link>
      ))}
    </nav>
  );
}
