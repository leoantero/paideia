import { describe, expect, it } from "vitest";
import { reviewToEvidence } from "../review-evidence";

const base = {
  card_id: "ef2-mat-potencias-01",
  concept_id: "c-1",
  concept_difficulty: 0.7,
  first_today: true,
  grade: "good" as const,
};

describe("reviewToEvidence", () => {
  it("turns a first review of an anchored card into clean retrieval evidence", () => {
    expect(reviewToEvidence(base, "revisao")).toEqual({
      concept_id: "c-1",
      source: "retrieval_review",
      signal: "correct",
      confidence: 0.9,
      difficulty: 0.7,
      metadata: {
        via: "revisao",
        grade: "good",
        card_id: "ef2-mat-potencias-01",
      },
    });
  });

  it("keeps uuid card ids as source_ref (learning_events.source_ref is uuid)", () => {
    const id = "0b5e6f1c-2a3d-4e5f-8a9b-0c1d2e3f4a5b";
    expect(reviewToEvidence({ ...base, card_id: id }, "x")?.source_ref).toBe(
      id
    );
  });

  it("maps every SM-2 grade to a learning-graph signal", () => {
    const signal = (grade: "again" | "hard" | "good" | "easy") =>
      reviewToEvidence({ ...base, grade }, "x")?.signal;
    expect([
      signal("again"),
      signal("hard"),
      signal("good"),
      signal("easy"),
    ]).toEqual(["incorrect", "partial", "correct", "correct"]);
  });

  it("produces nothing for unanchored cards or same-day relearning", () => {
    expect(reviewToEvidence({ ...base, concept_id: null }, "x")).toBeNull();
    expect(reviewToEvidence({ ...base, first_today: false }, "x")).toBeNull();
  });
});
