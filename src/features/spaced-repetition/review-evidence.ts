import type {
  EvidenceSignal,
  LearningEvent,
} from "@/src/features/learning-graph/types";
import type { ReviewGrade, ReviewResult } from "./types";

/**
 * Uma revisão de card ancorado em conceito vira evidência `retrieval_review`
 * no learning graph — é o que liga a repetição espaçada ao que responsável,
 * professor e gestor enxergam.
 *
 * Por que confidence 0.9: diferente do chat (ruidoso, teto 0.6), aqui o sinal
 * é limpo — o aluno viu a pergunta e tentou lembrar. É a segunda melhor
 * evidência que existe, atrás só de item de avaliação.
 *
 * Só a PRIMEIRA revisão do card no dia conta. Um card errado volta no fim da
 * mesma sessão, logo depois de o aluno ver a resposta; acertá-lo ali é
 * memória de curtíssimo prazo, não domínio, e inflaria o BKT.
 */

const SIGNAL_BY_GRADE: Record<ReviewGrade, EvidenceSignal> = {
  again: "incorrect",
  hard: "partial",
  good: "correct",
  easy: "correct",
};

export function reviewToEvidence(
  result: Pick<
    ReviewResult,
    "card_id" | "concept_id" | "concept_difficulty" | "first_today" | "grade"
  >,
  via: string
): LearningEvent | null {
  if (!result.concept_id || !result.first_today) return null;
  return {
    concept_id: result.concept_id,
    source: "retrieval_review",
    signal: SIGNAL_BY_GRADE[result.grade],
    confidence: 0.9,
    difficulty: result.concept_difficulty ?? 0.5,
    source_ref: result.card_id,
    metadata: { via, grade: result.grade },
  };
}
