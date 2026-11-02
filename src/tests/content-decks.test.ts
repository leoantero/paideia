// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadCurriculumFiles } from "@/scripts/lib/curriculum";
import { cardConceptCode, loadDecks } from "@/scripts/lib/decks";

/** Every concept code scripts/seed-curriculum.ts will create. */
function curriculumCodes(): Set<string> {
  return new Set(
    loadCurriculumFiles().flatMap((f) => f.concepts.map((c) => c.code))
  );
}

describe("content/decks", () => {
  const decks = loadDecks();

  it("validates every deck file", () => {
    expect(decks.length).toBeGreaterThan(0);
    expect(new Set(decks.map((d) => d.id)).size).toBe(decks.length);
  });

  it("anchors cards only to concepts that exist in the curriculum", () => {
    const known = curriculumCodes();
    const unknown = decks.flatMap((d) =>
      d.cards
        .map((_, i) => cardConceptCode(d, i))
        .filter((code): code is string => code !== null && !known.has(code))
    );
    expect(unknown).toEqual([]);
  });

  it("keeps AI-drafted decks out of students' reach until a human approves them", () => {
    const aiDrafted = decks.filter((d) =>
      d.sources.some((s) => /IA/.test(s.name))
    );
    expect(aiDrafted.every((d) => d.reviewStatus !== "approved")).toBe(true);
  });
});
