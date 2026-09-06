import { describe, expect, it } from "vitest";
import { applySocraticGuard, SOCRATIC_FALLBACK } from "@/src/features/tutoring/socratic-guard";

describe("applySocraticGuard", () => {
  it("flags a bare direct answer with no question", () => {
    const result = applySocraticGuard("The answer is 42 because it's the multiple of 6 and 7.");
    expect(result.flagged).toBe(true);
    expect(result.text).toBe(SOCRATIC_FALLBACK);
  });

  it("flags a bare direct answer in pt-BR with no question", () => {
    const result = applySocraticGuard("A resposta é 42 porque é o múltiplo de 6 e 7.");
    expect(result.flagged).toBe(true);
    expect(result.text).toBe(SOCRATIC_FALLBACK);
  });

  it("flags a bare number response", () => {
    const result = applySocraticGuard("96");
    expect(result.flagged).toBe(true);
  });

  it("flags a bare yes/no with no follow-up", () => {
    expect(applySocraticGuard("Yes.").flagged).toBe(true);
    expect(applySocraticGuard("Não.").flagged).toBe(true);
  });

  it("does not flag a genuine Socratic question", () => {
    const result = applySocraticGuard(
      "Boa pergunta! O que você acha que acontece quando a planta recebe luz do sol?"
    );
    expect(result.flagged).toBe(false);
    expect(result.text).toContain("O que você acha");
  });

  it("does not flag a response with a question even if it starts like an answer pattern", () => {
    const result = applySocraticGuard(
      "A resposta depende — o que aconteceria se você tentasse um exemplo menor primeiro?"
    );
    expect(result.flagged).toBe(false);
  });
});
