// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cardConceptCode, loadDecks } from "@/scripts/lib/decks";

/** Every concept code scripts/seed-curriculum.ts will create. */
function curriculumCodes(): Set<string> {
  const dir = path.join(__dirname, "../../scripts/data");
  const codes = new Set<string>();
  for (const file of readdirSync(dir)) {
    const data = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    for (const c of data.concepts ?? []) codes.add(c.code);
  }
  return codes;
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
