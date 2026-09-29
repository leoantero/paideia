import "server-only";
import { notFound } from "next/navigation";
import mat from "@/content/decks/ef2-mat-potencias.json";
import cie from "@/content/decks/ef2-cie-lua-energia.json";
import his from "@/content/decks/ef2-his-revolucoes.json";
import por from "@/content/decks/ef2-por-oracao-figuras.json";
import type { Leaderboard, StudentProgress } from "@/src/features/gamification/types";
import type { DeckOverview, StudyCard, Subject } from "@/src/features/spaced-repetition/types";

/**
 * Dev-only fixtures for /preview: renders the real student views without a
 * Supabase instance, using the real deck content and a simulated classroom.
 */
export function assertPreviewEnabled() {
  if (process.env.NODE_ENV === "production") notFound();
}

interface RawCard {
  kind: string;
  prompt: string;
  answer: string;
  choices?: string[];
  correctChoice?: number;
  acceptedAnswers?: string[];
}

interface RawDeck {
  id: string;
  title: string;
  subject: string;
  description: string;
  cards: RawCard[];
}

export const PREVIEW_DECKS = [mat, cie, his, por] as RawDeck[];

const cardId = (deckId: string, i: number) => `${deckId}-${String(i + 1).padStart(2, "0")}`;

export function findPreviewCard(id: string): RawCard | undefined {
  for (const deck of PREVIEW_DECKS) {
    const i = deck.cards.findIndex((_, idx) => cardId(deck.id, idx) === id);
    if (i >= 0) return deck.cards[i];
  }
  return undefined;
}

/** One multiple-choice, one short-answer and one open card per deck, interleaved. */
export function previewQueue(deckId: string | null): StudyCard[] {
  const decks = PREVIEW_DECKS.filter((d) => !deckId || d.id === deckId);
  const picks: StudyCard[] = [];
  for (const kind of ["multiple_choice", "short_answer", "open"]) {
    for (const deck of decks) {
      const i = deck.cards.findIndex((c) => c.kind === kind);
      if (i < 0) continue;
      const c = deck.cards[i];
      picks.push({
        id: cardId(deck.id, i),
        deck_id: deck.id,
        deck_title: deck.title,
        subject: deck.subject as Subject,
        kind: c.kind as StudyCard["kind"],
        prompt: c.prompt,
        choices: c.choices ?? null,
        is_new: kind !== "multiple_choice",
      });
    }
  }
  return picks;
}

export const PREVIEW_DECK_OVERVIEW: DeckOverview[] = PREVIEW_DECKS.map((d, i) => ({
  id: d.id,
  title: d.title,
  subject: d.subject as Subject,
  description: d.description,
  total_cards: d.cards.length,
  seen_cards: [9, 6, 12, 3][i],
  due_cards: [4, 0, 2, 1][i],
  mastered_cards: [5, 2, 7, 0][i],
}));

export const PREVIEW_PROGRESS: StudentProgress = {
  coins: 64,
  total_points: 1840,
  weekly_points: 212,
  streak: 12,
  streak_best: 19,
  active_today: false,
  streak_freezes: 1,
  max_streak_freezes: 2,
  streak_freeze_cost: 50,
  daily_goal_minutes: 10,
  study_seconds_today: 390,
  daily_goal_reached: false,
  due_today: 7,
  new_available: 10,
};

export const PREVIEW_LEADERBOARD: Leaderboard = {
  classroom: { name: "8º ano A", school: "Colégio Demonstração Paideia" },
  member_count: 24,
  entries: [
    { position: 1, name: "Helena C.", weekly_points: 348, delta: 0, is_me: false },
    { position: 2, name: "Davi D.", weekly_points: 301, delta: 1, is_me: false },
    { position: 3, name: "Sofia E.", weekly_points: 287, delta: -1, is_me: false },
    { position: 4, name: "Ana S.", weekly_points: 212, delta: 2, is_me: true },
    { position: 5, name: "Theo O.", weekly_points: 205, delta: -1, is_me: false },
    { position: 6, name: "Luísa P.", weekly_points: 190, delta: -1, is_me: false },
    { position: 7, name: "Arthur H.", weekly_points: 176, delta: null, is_me: false },
    { position: 8, name: "Manuela J.", weekly_points: 150, delta: 1, is_me: false },
    { position: 9, name: "Gael K.", weekly_points: 133, delta: -1, is_me: false },
    { position: 10, name: "Clara X.", weekly_points: 98, delta: 0, is_me: false },
  ],
};
