import type { LearningEvent } from "@/src/features/learning-graph/types";
import type { AnswerResult } from "./types";

/**
 * Uma questão de prova respondida vira evidência `assessment_item` — o sinal
 * mais limpo do learning graph: item calibrado, alternativas fechadas,
 * corrigido no servidor.
 *
 * Só a PRIMEIRA tentativa conta. Depois de errar, o aluno conversa com o
 * tutor e pode ver a resposta; acertar a mesma questão em seguida é eco da
 * conversa, não domínio, e inflaria o BKT.
 */
export function answerToEvidence(
  result: Pick<
    AnswerResult,
    | "attempt_id"
    | "question_id"
    | "concept_id"
    | "correct"
    | "first_attempt"
    | "difficulty"
  >,
  origin: string
): LearningEvent | null {
  if (!result.concept_id || !result.first_attempt) return null;
  return {
    concept_id: result.concept_id,
    source: "assessment_item",
    signal: result.correct ? "correct" : "incorrect",
    confidence: 0.9,
    difficulty: result.difficulty,
    source_ref: result.attempt_id,
    metadata: { question_id: result.question_id, origin },
  };
}
