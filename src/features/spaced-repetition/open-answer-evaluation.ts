import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { GradeBand } from "@/src/core/auth/types";
import { GRADE_BAND_LABELS } from "@/src/core/auth/types";
import type { ReviewGrade } from "./types";

/**
 * Open flashcards are graded through a short Socratic exchange instead of
 * self-assessment: the tutor judges the student's explanation against a
 * hidden reference answer and, when it falls short, replies with ONE
 * guiding question. The reference answer is only shown after the exchange
 * ends (like flipping an Anki card), never inside the tutor's replies.
 */

export const MAX_OPEN_ATTEMPTS = 3;

export const evaluationSchema = z.object({
  verdict: z.enum(["correct", "partially_correct", "incorrect"]),
  feedback: z.string().min(1),
  follow_up_question: z.string().nullable(),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

export const EVALUATION_TOOL: Anthropic.Tool = {
  name: "evaluate_answer",
  description: "Record the evaluation of the student's answer and the message to send them.",
  input_schema: {
    type: "object",
    properties: {
      verdict: {
        type: "string",
        enum: ["correct", "partially_correct", "incorrect"],
        description:
          "correct = captures the key idea(s) of the reference, even in the student's own words; partially_correct = on the right track but missing a key idea; incorrect = wrong or unrelated.",
      },
      feedback: {
        type: "string",
        description:
          "1-2 short sentences to the student in Brazilian Portuguese: acknowledge what is right in their reasoning. Never state or paraphrase the missing part of the reference answer.",
      },
      follow_up_question: {
        type: ["string", "null"],
        description:
          "If verdict is not correct: exactly one guiding question (Brazilian Portuguese) that helps the student discover the missing idea themself. Null when correct.",
      },
    },
    required: ["verdict", "feedback", "follow_up_question"],
  },
};

export function buildEvaluationSystemPrompt(
  gradeBand: GradeBand,
  card: { prompt: string; answer: string }
): string {
  return `You are a Socratic tutor reviewing a flashcard with a ${GRADE_BAND_LABELS[gradeBand]} student in Brazil.

FLASHCARD QUESTION: ${card.prompt}
REFERENCE ANSWER (hidden from the student): ${card.answer}

Evaluate the student's latest answer, considering the whole exchange so far. Judge understanding, not wording: accept correct ideas in the student's own words, and do not demand details beyond the reference answer.

HARD RULES:
1. Never reveal, quote or paraphrase the reference answer or the part the student is missing.
2. If the answer is not correct, ask exactly ONE guiding question that points the student toward the missing idea (e.g. about a cause, an example, or a step), adapted to their level.
3. Be warm and specific about what they got right. Do not say "wrong" bluntly.
4. Write feedback and questions in Brazilian Portuguese, with vocabulary suitable for a ${GRADE_BAND_LABELS[gradeBand]} student.

Always respond by calling the evaluate_answer tool.`;
}

export interface AttemptOutcome {
  /** The exchange ends: record the review and reveal the reference answer. */
  final: boolean;
  grade: ReviewGrade | null;
}

/** Maps the tutor's verdict on the Nth attempt to an SM-2 grade. */
export function resolveOpenAttempt(
  verdict: Evaluation["verdict"],
  attempt: number
): AttemptOutcome {
  if (verdict === "correct") {
    return { final: true, grade: attempt === 1 ? "good" : "hard" };
  }
  if (attempt >= MAX_OPEN_ATTEMPTS) {
    return { final: true, grade: verdict === "partially_correct" ? "hard" : "again" };
  }
  return { final: false, grade: null };
}
