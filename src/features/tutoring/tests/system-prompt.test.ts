import { describe, expect, it } from "vitest";
import { buildSocraticSystemPrompt } from "@/src/features/tutoring/socratic-system-prompt";
import type { GradeBand } from "@/src/core/auth/types";

const GRADE_BANDS: GradeBand[] = ["elementary_1", "elementary_2", "high_school"];

describe("buildSocraticSystemPrompt", () => {
  it.each(GRADE_BANDS)(
    "includes the hard Socratic constraints for %s",
    (gradeBand) => {
      const prompt = buildSocraticSystemPrompt(gradeBand, "math");

      expect(prompt).toMatch(/never state the final answer/i);
      expect(prompt).toMatch(/guiding question/i);
    }
  );

  it("includes the photosynthesis few-shot example", () => {
    const prompt = buildSocraticSystemPrompt("elementary_2", "science");
    expect(prompt).toContain("What is photosynthesis?");
    expect(prompt).toContain("do you think happens when plants get sunlight");
  });

  it("varies grade-appropriate framing by grade band", () => {
    const elementary = buildSocraticSystemPrompt("elementary_1", "math");
    const highSchool = buildSocraticSystemPrompt("high_school", "math");
    expect(elementary).not.toEqual(highSchool);
  });
});
