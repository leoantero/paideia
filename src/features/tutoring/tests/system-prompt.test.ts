import { describe, expect, it } from "vitest";
import { buildSocraticSystemPrompt } from "@/src/features/tutoring/socratic-system-prompt";
import type { GradeBand } from "@/src/core/auth/types";

const GRADE_BANDS: GradeBand[] = ["elementary_1", "elementary_2", "high_school"];

describe("buildSocraticSystemPrompt", () => {
  it.each(GRADE_BANDS)(
    "includes the hard Socratic constraints for %s",
    (gradeBand) => {
      const prompt = buildSocraticSystemPrompt(gradeBand, "math");

      expect(prompt).toMatch(/nunca diga a resposta final/i);
      expect(prompt).toMatch(/pergunta que guie o aluno/i);
    }
  );

  it("instructs the tutor to answer in pt-BR", () => {
    const prompt = buildSocraticSystemPrompt("elementary_2", "math");
    expect(prompt).toMatch(/português do brasil/i);
  });

  it("includes the photosynthesis few-shot example", () => {
    const prompt = buildSocraticSystemPrompt("elementary_2", "science");
    expect(prompt).toContain("O que é fotossíntese?");
    expect(prompt).toContain("acontece quando a planta recebe luz do sol");
  });

  it("varies grade-appropriate framing by grade band", () => {
    const elementary = buildSocraticSystemPrompt("elementary_1", "math");
    const highSchool = buildSocraticSystemPrompt("high_school", "math");
    expect(elementary).not.toEqual(highSchool);
  });
});
