import { beforeEach, describe, expect, it, vi } from "vitest";

const generateStructuredCompletion = vi.fn();
vi.mock("@/src/core/ai-integration/anthropic-client", () => ({
  generateStructuredCompletion: (...args: unknown[]) =>
    generateStructuredCompletion(...args),
}));

import { tagTurn } from "@/src/features/learning-graph/concept-tagger";

const CANDIDATES = [
  { id: "11111111-1111-1111-1111-111111111111", code: "EF08MA-A", name: "Frações", subject: "math", grade_band: "elementary_2", grade_year: 8, description: null, intrinsic_difficulty: 0.4 },
  { id: "22222222-2222-2222-2222-222222222222", code: "EF08MA-B", name: "Função afim", subject: "math", grade_band: "elementary_2", grade_year: 8, description: null, intrinsic_difficulty: 0.7 },
];

function fakeSupabase() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => Promise.resolve({ data: CANDIDATES }),
          }),
        }),
      }),
    }),
  } as never;
}

const baseArgs = () => ({
  supabase: fakeSupabase(),
  studentMessage: "não entendi frações",
  tutorReply: "o que 1/2 significa pra você?",
  subject: "math",
  gradeBand: "elementary_2" as const,
  messageId: "99999999-9999-9999-9999-999999999999",
});

beforeEach(() => generateStructuredCompletion.mockReset());

describe("tagTurn", () => {
  it("mapeia eventos válidos e ancora no messageId", async () => {
    generateStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        events: [
          { concept_id: CANDIDATES[0].id, signal: "struggling", confidence: 0.5 },
        ],
      })
    );

    const { events, conceptIds } = await tagTurn(baseArgs());

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      concept_id: CANDIDATES[0].id,
      source: "tutor_turn",
      signal: "struggling",
      source_ref: "99999999-9999-9999-9999-999999999999",
    });
    expect(conceptIds).toEqual([CANDIDATES[0].id]);
  });

  it("descarta concept_id alucinado (não está nos candidatos)", async () => {
    generateStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        events: [
          { concept_id: "deadbeef-0000-0000-0000-000000000000", signal: "correct", confidence: 0.9 },
        ],
      })
    );

    const { events } = await tagTurn(baseArgs());
    expect(events).toHaveLength(0);
  });

  it("aplica o teto de 0.6 na confidence de tutor_turn", async () => {
    generateStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        events: [{ concept_id: CANDIDATES[1].id, signal: "correct", confidence: 0.95 }],
      })
    );

    const { events } = await tagTurn(baseArgs());
    expect(events[0].confidence).toBeLessThanOrEqual(0.6);
    expect(events[0].confidence).toBeGreaterThan(0);
  });

  it("nunca lança — falha de infra vira resultado vazio", async () => {
    generateStructuredCompletion.mockResolvedValue(
      JSON.stringify({ events: [{ concept_id: CANDIDATES[0].id, signal: "correct", confidence: 0.5 }] })
    );
    const broken = {
      supabase: {
        from: () => {
          throw new Error("connection refused");
        },
      } as never,
      studentMessage: "x",
      tutorReply: "y",
      subject: "math",
      gradeBand: "elementary_2" as const,
      messageId: "99999999-9999-9999-9999-999999999999",
    };
    await expect(tagTurn(broken)).resolves.toEqual({ events: [], conceptIds: [] });
  });

  it("resposta sem JSON vira resultado vazio", async () => {
    generateStructuredCompletion.mockResolvedValue("desculpa, não consegui classificar");
    await expect(tagTurn(baseArgs())).resolves.toEqual({ events: [], conceptIds: [] });
  });

  it("deduplica o mesmo conceito no mesmo turno", async () => {
    generateStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        events: [
          { concept_id: CANDIDATES[0].id, signal: "struggling", confidence: 0.5 },
          { concept_id: CANDIDATES[0].id, signal: "incorrect", confidence: 0.4 },
        ],
      })
    );

    const { events } = await tagTurn(baseArgs());
    expect(events).toHaveLength(1);
  });
});
