import { describe, expect, it } from "vitest";
import {
  EVALUATION_TOOL,
  MAX_OPEN_ATTEMPTS,
  buildEvaluationSystemPrompt,
  evaluationSchema,
  resolveOpenAttempt,
} from "../open-answer-evaluation";

const card = {
  prompt: "Por que vemos a Lua em fases?",
  answer: "Vemos partes diferentes da metade iluminada pelo Sol.",
};

describe("open-card Socratic evaluation", () => {
  it("keeps the no-reveal and one-guiding-question rules in the prompt for every grade band", () => {
    for (const band of ["elementary_1", "elementary_2", "high_school"] as const) {
      const prompt = buildEvaluationSystemPrompt(band, card);
      expect(prompt).toContain("Never reveal");
      expect(prompt).toContain("exactly ONE guiding question");
      expect(prompt).toContain(card.answer);
      expect(prompt).toContain("Brazilian Portuguese");
    }
  });

  it("ends the exchange on a correct answer, rewarding first-try understanding more", () => {
    expect(resolveOpenAttempt("correct", 1)).toEqual({ final: true, grade: "good" });
    expect(resolveOpenAttempt("correct", 2)).toEqual({ final: true, grade: "hard" });
  });

  it("keeps guiding with questions until the attempt limit", () => {
    for (let attempt = 1; attempt < MAX_OPEN_ATTEMPTS; attempt++) {
      expect(resolveOpenAttempt("incorrect", attempt)).toEqual({ final: false, grade: null });
      expect(resolveOpenAttempt("partially_correct", attempt)).toEqual({ final: false, grade: null });
    }
  });

  it("closes after the last attempt: partial understanding counts as 'hard', none as 'again'", () => {
    expect(resolveOpenAttempt("partially_correct", MAX_OPEN_ATTEMPTS)).toEqual({ final: true, grade: "hard" });
    expect(resolveOpenAttempt("incorrect", MAX_OPEN_ATTEMPTS)).toEqual({ final: true, grade: "again" });
  });

  it("tool schema and zod schema agree on required fields", () => {
    expect(EVALUATION_TOOL.input_schema.required).toEqual(Object.keys(evaluationSchema.shape));
    expect(
      evaluationSchema.safeParse({ verdict: "correct", feedback: "Isso!", follow_up_question: null }).success
    ).toBe(true);
    expect(evaluationSchema.safeParse({ verdict: "maybe", feedback: "" }).success).toBe(false);
  });
});
