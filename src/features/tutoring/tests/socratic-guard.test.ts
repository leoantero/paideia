import { describe, expect, it } from "vitest";
import { applySocraticGuard, SOCRATIC_FALLBACK } from "@/src/features/tutoring/socratic-guard";

describe("applySocraticGuard", () => {
  it("flags a bare direct answer with no question", () => {
    const result = applySocraticGuard("The answer is 42 because it's the multiple of 6 and 7.");
    expect(result.flagged).toBe(true);
    expect(result.text).toBe(SOCRATIC_FALLBACK);
  });

  it("flags a bare number response", () => {
    const result = applySocraticGuard("96");
    expect(result.flagged).toBe(true);
  });

  it("flags a bare yes/no with no follow-up", () => {
    const result = applySocraticGuard("Yes.");
    expect(result.flagged).toBe(true);
  });

  it("does not flag a genuine Socratic question", () => {
    const result = applySocraticGuard(
      "Great question! What do you think happens when plants get sunlight?"
    );
    expect(result.flagged).toBe(false);
    expect(result.text).toContain("What do you think");
  });

  it("does not flag a response with a question even if it starts like an answer pattern", () => {
    const result = applySocraticGuard(
      "It is worth thinking about — what would happen if you tried a smaller example first?"
    );
    expect(result.flagged).toBe(false);
  });
});
