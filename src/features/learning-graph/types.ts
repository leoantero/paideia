import type { GradeBand } from "@/src/core/auth/types";

/** Espelha `concepts` (supabase/migrations/0007_curriculum_graph.sql). */
export interface Concept {
  id: string;
  code: string;              // 'EF08MA06' quando existir codigo BNCC
  name: string;
  subject: string;
  grade_band: GradeBand;
  grade_year: number | null;
  description: string | null;
  intrinsic_difficulty: number;  // 0..1, alimenta o prior do BKT
}

export type EvidenceSource =
  | "tutor_turn"
  | "retrieval_review"
  | "assessment_item"
  | "teacher_observation";

export type EvidenceSignal =
  | "correct"
  | "partial"
  | "incorrect"
  | "struggling"
  | "insight";

/**
 * Uma evidencia de aprendizagem. Isso e o ativo do produto -- append-only,
 * nunca sofre update. Ver docs/LEARNING_GRAPH.md.
 */
export interface LearningEvent {
  concept_id: string;
  source: EvidenceSource;
  signal: EvidenceSignal;
  /** Quanto confiamos que a evidencia e real. Chat ~0.3-0.6, prova ~0.95. */
  confidence: number;
  /** Dificuldade do que foi tentado (0..1). Sem isso nao da pra distinguir
   *  acertar o facil de acertar o dificil. */
  difficulty?: number;
  /** message_id / item_id de origem. Sem FK: a origem pode expirar por
   *  retencao sem matar a evidencia. */
  source_ref?: string;
  metadata?: Record<string, unknown>;
}

/** Espelha `concept_mastery`. Derivado -- sempre recomputavel dos eventos. */
export interface ConceptMastery {
  student_id: string;
  concept_id: string;
  mastery: number;            // posterior P(domina)
  confidence: number;         // quanta evidencia sustenta o numero
  evidence_count: number;
  last_evidence_at: string | null;
  next_review_at: string | null;
  review_interval_days: number;
  model_version: string;
}

/** Linha de diagnose_weak_prerequisites(). */
export interface WeakPrerequisite {
  concept_id: string;
  concept_code: string;
  concept_name: string;
  depth: number;
  mastery: number;
  /** cumulative_strength * (1 - mastery). Ordena o que mais explica o travamento. */
  blocking_score: number;
}
