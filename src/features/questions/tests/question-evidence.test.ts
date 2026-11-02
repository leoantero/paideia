import { describe, expect, it } from "vitest";
import { answerToEvidence } from "../question-evidence";

const base = {
  attempt_id: "0b5e6f1c-2a3d-4e5f-8a9b-0c1d2e3f4a5b",
  question_id: "q-1",
  concept_id: "c-1",
  correct: true,
  first_attempt: true,
  difficulty: 0.62,
};

describe("answerToEvidence", () => {
  it("turns a first attempt into clean assessment evidence anchored on the concept", () => {
    expect(answerToEvidence(base, "enem")).toEqual({
      concept_id: "c-1",
      source: "assessment_item",
      signal: "correct",
      confidence: 0.9,
      difficulty: 0.62,
      source_ref: base.attempt_id,
      metadata: { question_id: "q-1", origin: "enem" },
    });
  });

  it("records a wrong first attempt as incorrect", () => {
    expect(answerToEvidence({ ...base, correct: false }, "enem")?.signal).toBe(
      "incorrect"
    );
  });

  it("ignores retries, which only echo the tutor conversation", () => {
    expect(
      answerToEvidence({ ...base, first_attempt: false }, "enem")
    ).toBeNull();
  });
});
