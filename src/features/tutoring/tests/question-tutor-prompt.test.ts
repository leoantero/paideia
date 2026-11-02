import { describe, expect, it } from "vitest";
import {
  buildOpeningTurn,
  buildQuestionTutorPrompt,
  buildRevealedTurn,
  tutorSubjectFor,
  withSyntheticTurns,
} from "@/src/features/tutoring/question-tutor-prompt";
import type { QuestionTutorContext } from "@/src/features/questions/types";

const ctx: QuestionTutorContext = {
  attempt_id: "a-1",
  chosen_letter: "B",
  correct: false,
  revealed: false,
  question: {
    id: "q-1",
    exam_label: "ENEM 2019 · 2º dia",
    item_number: 145,
    subject: "math",
    concept_name: "Potências e notação científica",
    stem: [
      { type: "text", text: "Qual destes números é igual a 3,2 × 10⁴?" },
      {
        type: "image",
        path: "enem/2019/145.png",
        alt: "Régua numerada de 0 a 40 000",
        width: 600,
        height: 200,
      },
    ],
    alternatives: [
      { letter: "A", text: "320" },
      { letter: "B", text: "3 200" },
      { letter: "C", text: "32 000" },
      { letter: "D", text: "320 000" },
    ],
    correct_letter: "C",
  },
};

describe("buildQuestionTutorPrompt", () => {
  it("keeps the hard Socratic rules of the base prompt", () => {
    const prompt = buildQuestionTutorPrompt("elementary_2", ctx);
    expect(prompt).toMatch(/nunca diga a resposta final/i);
    expect(prompt).toMatch(/pergunta que guie o aluno/i);
  });

  it("gives the tutor the question, the student's choice and figures as text", () => {
    const prompt = buildQuestionTutorPrompt("elementary_2", ctx);
    expect(prompt).toContain("3,2 × 10⁴");
    expect(prompt).toContain("(B) 3 200");
    expect(prompt).toContain("[Figura: Régua numerada de 0 a 40 000]");
    expect(prompt).toContain("marcou B");
  });

  it("marks the answer key as secret until the student reveals it", () => {
    const hidden = buildQuestionTutorPrompt("elementary_2", ctx);
    expect(hidden).toMatch(/gabarito é sigiloso/i);
    expect(hidden).toMatch(/NÃO diga qual alternativa é a correta/);
    expect(hidden).toMatch(/por que B pareceu certa/);

    const revealed = buildQuestionTutorPrompt("elementary_2", {
      ...ctx,
      revealed: true,
    });
    expect(revealed).not.toMatch(/gabarito é sigiloso/i);
    expect(revealed).toMatch(/JÁ VIU que a correta é C/);
  });

  it("goes one step further after a correct answer", () => {
    const prompt = buildQuestionTutorPrompt("high_school", {
      ...ctx,
      chosen_letter: "C",
      correct: true,
    });
    expect(prompt).toMatch(/ACERTOU/);
    expect(prompt).toMatch(/POR QUE a C está certa/);
  });
});

describe("buildOpeningTurn", () => {
  it("asks why the wrong choice was made, without revealing", () => {
    expect(buildOpeningTurn(ctx)).toMatch(/perguntando por que ele escolheu B/);
    expect(buildOpeningTurn(ctx)).not.toContain("C");
  });
});

describe("withSyntheticTurns", () => {
  it("puts the hidden event first so the API sees a user turn before the tutor's opener", () => {
    expect(
      withSyntheticTurns("[evento]", [
        { role: "assistant", content: "Por que B?" },
      ])
    ).toEqual([
      { role: "user", content: "[evento]" },
      { role: "assistant", content: "Por que B?" },
    ]);
  });

  it("merges consecutive turns of the same role", () => {
    expect(
      withSyntheticTurns(
        "[evento]",
        [
          { role: "user", content: "achei que era" },
          { role: "assistant", content: "Por quê?" },
          { role: "user", content: "não sei" },
        ],
        "[viu a resposta]"
      )
    ).toEqual([
      { role: "user", content: "[evento]\n\nachei que era" },
      { role: "assistant", content: "Por quê?" },
      { role: "user", content: "não sei\n\n[viu a resposta]" },
    ]);
  });
});

describe("buildRevealedTurn", () => {
  it("tells the tutor the key is now known", () => {
    expect(buildRevealedTurn(ctx)).toMatch(/correta é C/);
  });
});

describe("tutorSubjectFor", () => {
  it("buckets ENEM subjects into the tutor's subjects", () => {
    expect(tutorSubjectFor("chemistry")).toBe("science");
    expect(tutorSubjectFor("geography")).toBe("history");
    expect(tutorSubjectFor("english")).toBe("language");
    expect(tutorSubjectFor("unknown")).toBe("general");
  });
});
