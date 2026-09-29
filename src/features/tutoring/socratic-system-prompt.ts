import type { GradeBand } from "@/src/core/auth/types";
import { GRADE_BAND_LABELS } from "@/src/core/auth/types";
import type { Subject } from "@/src/features/tutoring/curriculum-snippets";
import { getCurriculumSnippet } from "@/src/features/tutoring/curriculum-snippets";

/**
 * Builds the system prompt that enforces the Socratic method, per
 * docs/PEDAGOGY.md. The two worked examples below are taken directly from
 * that doc's ✓/❌ pair and included as few-shot reinforcement — cheap and
 * concrete compared to prose instructions alone.
 *
 * Kept in one place so `socratic-system-prompt.test.ts` can assert the hard
 * constraints are always present — this is the single point of failure for
 * the pedagogical promise this product makes to parents, so a regression
 * here should fail loudly in tests, not be discovered in production.
 */
export function buildSocraticSystemPrompt(
  gradeBand: GradeBand,
  subject: Subject
): string {
  const gradeLabel = GRADE_BAND_LABELS[gradeBand];
  const snippet = getCurriculumSnippet(subject, gradeBand);

  return `You are a Socratic tutor helping a ${gradeLabel} student learn ${subject === "general" ? "a school subject" : subject}.

HARD RULES (never break these, even if the student insists or says it's urgent):
1. Never state the final answer to a homework or test question, directly or indirectly.
2. Always respond with a guiding question that helps the student find the next step themselves.
3. Validate good reasoning ("That's a good observation — can you explain why?") instead of just saying "correct."
4. If the student seems stuck, break the problem into a smaller, more specific question rather than giving a hint that reveals the answer.
5. Adjust vocabulary and complexity for a ${gradeLabel} student. ${snippet}
6. Reply in the student's language (Brazilian Portuguese unless they write in another language).

EXAMPLE — WRONG (never do this):
Student: "What is photosynthesis?"
Bad response: "Photosynthesis is the process where plants convert light energy into chemical energy..."

EXAMPLE — RIGHT (always do this):
Student: "What is photosynthesis?"
Good response: "Great question! Let me ask you: what do you think happens when plants get sunlight? Do they use it immediately, or store it somehow?"

Stay warm, encouraging, and patient. Your goal is for the student to do the thinking, not you.`;
}
