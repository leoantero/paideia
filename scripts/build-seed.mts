/**
 * Generates supabase/seed.sql (run automatically by `supabase db reset`):
 *   1. curriculum decks from content/decks/*.json (review status as written
 *      there — flip "reviewStatus" to "approved" only after a human review);
 *   2. a fictional demo school/classroom with simulated classmates, so the
 *      leaderboard has data. Real students join it with code 8A-DEMO.
 *
 * Usage: npm run seed:build
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const cardSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("multiple_choice"),
    prompt: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2).max(5),
    correctChoice: z.number().int().min(0),
    answer: z.string().min(1),
  }),
  z.object({
    kind: z.literal("short_answer"),
    prompt: z.string().min(1),
    acceptedAnswers: z.array(z.string().min(1)).min(1),
    answer: z.string().min(1),
  }),
  z.object({
    kind: z.literal("open"),
    prompt: z.string().min(1),
    answer: z.string().min(1),
  }),
]);

export const deckSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    subject: z.enum(["math", "science", "language", "history"]),
    gradeLevel: z.enum(["elementary_1", "elementary_2", "high_school"]),
    description: z.string(),
    bnccCodes: z.array(z.string()),
    reviewStatus: z.enum(["pending_review", "approved", "rejected"]),
    sources: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url().optional(),
          license: z.string(),
          usage: z.string(),
        })
      )
      .min(1),
    cards: z.array(cardSchema).min(1),
  })
  .superRefine((deck, ctx) => {
    deck.cards.forEach((card, i) => {
      if (card.kind === "multiple_choice" && card.correctChoice >= card.choices.length) {
        ctx.addIssue({ code: "custom", message: `card ${i + 1}: correctChoice out of range` });
      }
    });
  });

export type Deck = z.infer<typeof deckSchema>;

export function loadDecks(dir = path.join(ROOT, "content/decks")): Deck[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => {
      const parsed = deckSchema.safeParse(JSON.parse(readFileSync(path.join(dir, file), "utf8")));
      if (!parsed.success) {
        throw new Error(`${file}: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
      }
      return parsed.data;
    });
}

const lit = (value: string | null | undefined): string =>
  value == null ? "null" : `'${value.replace(/'/g, "''")}'`;
const textArray = (values: string[] | undefined): string =>
  values ? `array[${values.map(lit).join(", ")}]::text[]` : "null";

export const cardId = (deckId: string, position: number) =>
  `${deckId}-${String(position).padStart(2, "0")}`;

function deckSql(deck: Deck): string {
  const lines = [
    `insert into decks (id, title, subject, grade_level, description, bncc_codes, sources, review_status) values (` +
      [
        lit(deck.id),
        lit(deck.title),
        lit(deck.subject),
        `${lit(deck.gradeLevel)}::grade_band`,
        lit(deck.description),
        textArray(deck.bnccCodes),
        `${lit(JSON.stringify(deck.sources))}::jsonb`,
        `${lit(deck.reviewStatus)}::content_review_status`,
      ].join(", ") +
      `)\non conflict (id) do update set title = excluded.title, subject = excluded.subject, grade_level = excluded.grade_level,` +
      ` description = excluded.description, bncc_codes = excluded.bncc_codes, sources = excluded.sources, review_status = excluded.review_status;`,
  ];

  deck.cards.forEach((card, i) => {
    const position = i + 1;
    const choices = card.kind === "multiple_choice" ? textArray(card.choices) : "null";
    const correct = card.kind === "multiple_choice" ? String(card.correctChoice) : "null";
    const accepted = card.kind === "short_answer" ? textArray(card.acceptedAnswers) : "null";
    lines.push(
      `insert into cards (id, deck_id, position, kind, prompt, answer, choices, correct_choice, accepted_answers) values (` +
        [
          lit(cardId(deck.id, position)),
          lit(deck.id),
          position,
          `${lit(card.kind)}::card_kind`,
          lit(card.prompt),
          lit(card.answer),
          choices,
          correct,
          accepted,
        ].join(", ") +
        `)\non conflict (id) do update set position = excluded.position, kind = excluded.kind, prompt = excluded.prompt,` +
        ` answer = excluded.answer, choices = excluded.choices, correct_choice = excluded.correct_choice, accepted_answers = excluded.accepted_answers;`
    );
  });

  lines.push(
    `delete from cards where deck_id = ${lit(deck.id)} and position > ${deck.cards.length};`
  );
  return lines.join("\n");
}

// Fictional classmates (no real people). Deterministic so the seed is stable.
const FIRST_NAMES = [
  "Alice", "Miguel", "Helena", "Arthur", "Laura", "Heitor", "Valentina", "Davi",
  "Sofia", "Gael", "Manuela", "Theo", "Luísa", "Bernardo", "Isabela", "Samuel",
  "Beatriz", "Rafael", "Lívia", "Gustavo", "Yasmin", "Enzo", "Clara",
];
const LAST_NAMES = [
  "Andrade", "Barbosa", "Cardoso", "Dias", "Esteves", "Fonseca", "Gomes", "Holanda",
  "Iglesias", "Jardim", "Kato", "Leal", "Macedo", "Nogueira", "Oliveira", "Pires",
  "Queiroz", "Rocha", "Siqueira", "Tavares", "Uchoa", "Vieira", "Xavier",
];

export const DEMO_SCHOOL_ID = "5c400000-0000-4000-8000-000000000001";
export const DEMO_CLASSROOM_ID = "c1a55000-0000-4000-8000-000000000001";
export const DEMO_JOIN_CODE = "8A-DEMO";

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function demoClassroomSql(): string {
  const rand = mulberry32(2026);
  const lines = [
    `insert into schools (id, name) values (${lit(DEMO_SCHOOL_ID)}, 'Colégio Demonstração Paideia') on conflict (id) do nothing;`,
    `insert into classrooms (id, school_id, name, grade_level, school_year, join_code) values (` +
      `${lit(DEMO_CLASSROOM_ID)}, ${lit(DEMO_SCHOOL_ID)}, '8º ano A', 'elementary_2', 2026, ${lit(DEMO_JOIN_CODE)}) on conflict (id) do nothing;`,
  ];

  FIRST_NAMES.forEach((first, i) => {
    const id = `5a1d0000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const fullName = `${first} ${LAST_NAMES[i]}`;
    const diligence = 0.25 + rand() * 0.75;

    lines.push(
      `insert into auth.users (id, email, raw_user_meta_data) values (${lit(id)}, ` +
        `${lit(`aluno.simulado.${i + 1}@demo.paideia.local`)}, ` +
        `${lit(JSON.stringify({ role: "student", full_name: fullName }))}::jsonb) on conflict (id) do nothing;`,
      `update students set classroom_id = ${lit(DEMO_CLASSROOM_ID)}, grade_level = 'elementary_2', ` +
        `school_name = 'Colégio Demonstração Paideia' where id = ${lit(id)};`
    );

    let streak = 0;
    let coins = 0;
    let points = 0;
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      if (rand() > diligence) {
        streak = 0;
        continue;
      }
      streak += 1;
      const dayPoints = 20 + Math.round(rand() * 90 * diligence);
      const dayCoins = Math.round(dayPoints / 9);
      points += dayPoints;
      coins += dayCoins;
      const when =
        daysAgo === 0
          ? `greatest(app_day_start(app_today()), app_now() - interval '${1 + Math.floor(rand() * 50)} minutes')`
          : `app_day_start(app_today() - ${daysAgo}) + interval '${14 + Math.floor(rand() * 6)} hours'`;
      lines.push(
        `insert into reward_events (student_id, source, ref, points, coins, created_at) values ` +
          `(${lit(id)}, 'card_review', 'seed', ${dayPoints}, ${dayCoins}, ${when});`
      );
    }

    const activeToday = streak > 0;
    lines.push(
      `insert into student_progress (student_id, coins, total_points, streak_current, streak_best, last_active_on, streak_freezes) values (` +
        `${lit(id)}, ${coins}, ${points}, ${streak}, ${Math.max(streak, Math.round(diligence * 12))}, ` +
        `${activeToday ? "app_today()" : "app_today() - 1"}, ${rand() > 0.7 ? 1 : 0}) on conflict (student_id) do nothing;`
    );
  });

  return lines.join("\n");
}

export function buildSeedSql(decks: Deck[] = loadDecks()): string {
  return [
    "-- GENERATED by scripts/build-seed.mts — edit content/decks/*.json instead.",
    "-- Demo data only: fictional school and simulated students for local development.",
    "",
    "-- Curriculum decks",
    ...decks.map(deckSql),
    "",
    "-- Demo classroom (join code 8A-DEMO) with simulated classmates",
    demoClassroomSql(),
    "",
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const decks = loadDecks();
  writeFileSync(path.join(ROOT, "supabase/seed.sql"), buildSeedSql(decks));
  const pending = decks.filter((d) => d.reviewStatus !== "approved").map((d) => d.id);
  console.log(`supabase/seed.sql written: ${decks.length} decks, ${decks.reduce((n, d) => n + d.cards.length, 0)} cards.`);
  if (pending.length) {
    console.log(`Not visible to students until approved: ${pending.join(", ")}`);
  }
}
