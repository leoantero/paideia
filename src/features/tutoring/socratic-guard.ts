/**
 * Heuristic post-check on the model's raw completion, run before it's
 * persisted or returned to the student. This is an architectural backstop
 * to the system prompt, NOT a guarantee — an LLM can still slip past a
 * heuristic. Documented here explicitly so nobody mistakes this for a
 * complete solution (see docs/PEDAGOGY.md, "Anti-Patterns We Avoid").
 *
 * Heuristic: if the response contains no question mark at all AND matches a
 * pattern typical of a direct/final answer, treat it as a likely violation
 * and substitute a canned Socratic fallback instead of returning it as-is.
 */

const DIRECT_ANSWER_PATTERNS: RegExp[] = [
  /^(the answer is|it is|the result is|that equals|equals)\b/i,
  /^(a resposta (é|e|seria)|o resultado (é|e|seria)|isso (é|e) igual a|portanto,? \d)/i,
  /^\d+(\.\d+)?\s*$/, // a bare number and nothing else
  /^(yes|no)\.?\s*$/i, // a bare yes/no with no follow-up question
  /^(sim|não|nao)\.?\s*$/i, // "sim"/"não" seco, sem pergunta de continuação
];

export const SOCRATIC_FALLBACK =
  "Isso vale a pena explorar — o que você já tentou até agora? O que você já sabe que poderia se aplicar aqui?";

export interface GuardResult {
  text: string;
  flagged: boolean;
}

export function applySocraticGuard(rawResponse: string): GuardResult {
  const trimmed = rawResponse.trim();
  const hasQuestion = trimmed.includes("?");
  const looksLikeDirectAnswer = DIRECT_ANSWER_PATTERNS.some((pattern) =>
    pattern.test(trimmed)
  );

  if (!hasQuestion && looksLikeDirectAnswer) {
    return { text: SOCRATIC_FALLBACK, flagged: true };
  }

  return { text: rawResponse, flagged: false };
}

/**
 * Logs a guard violation for later prompt tuning. Intentionally logs no
 * student content or PII — only enough to know it happened and roughly
 * where, per the privacy priorities in CLAUDE.md.
 */
export function logGuardViolation(conversationId: string): void {
  console.warn(
    `[socratic-guard] Flagged a likely direct-answer response in conversation ${conversationId}. Consider reviewing prompt tuning.`
  );
}
