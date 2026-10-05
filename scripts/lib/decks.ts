import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

/**
 * Baralhos curados de content/decks/*.json. Puro (sem banco) para que a
 * validação rode nos testes: um JSON quebrado ou um `conceptCode` que não
 * existe no currículo falha no `npm test`, não no meio do seed.
 *
 * `conceptCode` (no baralho, como padrão, ou no card) ancora o card num
 * conceito de scripts/data/ — é o que faz a revisão virar evidência no
 * learning graph. Card sem âncora funciona na revisão, mas não gera evidência.
 */

const conceptCode = z.string().min(1).optional();

const cardSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("multiple_choice"),
    prompt: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2).max(5),
    correctChoice: z.number().int().min(0),
    answer: z.string().min(1),
    conceptCode,
  }),
  z.object({
    kind: z.literal("short_answer"),
    prompt: z.string().min(1),
    acceptedAnswers: z.array(z.string().min(1)).min(1),
    answer: z.string().min(1),
    conceptCode,
  }),
  z.object({
    kind: z.literal("open"),
    prompt: z.string().min(1),
    answer: z.string().min(1),
    conceptCode,
  }),
]);

export const SUBJECTS = [
  "math",
  "science",
  "language",
  "history",
  "physics",
  "biology",
  "chemistry",
] as const;

export const deckSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    subject: z.enum(SUBJECTS),
    gradeLevel: z.enum(["elementary_1", "elementary_2", "high_school"]),
    description: z.string(),
    bnccCodes: z.array(z.string()),
    conceptCode,
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
      if (
        card.kind === "multiple_choice" &&
        card.correctChoice >= card.choices.length
      ) {
        ctx.addIssue({
          code: "custom",
          message: `card ${i + 1}: correctChoice out of range`,
        });
      }
    });
  });

export type Deck = z.infer<typeof deckSchema>;

const ROOT = path.resolve(__dirname, "../..");

export function loadDecks(dir = path.join(ROOT, "content/decks")): Deck[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => {
      const parsed = deckSchema.safeParse(
        JSON.parse(readFileSync(path.join(dir, file), "utf8"))
      );
      if (!parsed.success) {
        throw new Error(
          `${file}: ${parsed.error.issues.map((i) => i.message).join("; ")}`
        );
      }
      return parsed.data;
    });
}

/** Estável entre seeds: o estado SM-2 do aluno fica preso a este id. */
export const cardId = (deckId: string, position: number) =>
  `${deckId}-${String(position).padStart(2, "0")}`;

export const cardConceptCode = (deck: Deck, index: number) =>
  deck.cards[index].conceptCode ?? deck.conceptCode ?? null;
