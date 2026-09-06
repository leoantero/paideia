import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningEvent } from "./types";
import { BKT_MODEL_VERSION, nextReview, replayMastery } from "./bkt";

/**
 * Grava evidencia e reprocessa o dominio dos conceitos tocados.
 *
 * Substitui recordTutoringSession() de src/features/performance/performance-service.ts,
 * que so incrementava um contador de sessao.
 *
 * Nao-fatal por design: se a instrumentacao falhar, o chat continua. Perder um
 * evento e ruim; derrubar a aula do aluno e pior.
 */
export async function recordEvidence(
  supabase: SupabaseClient,
  events: LearningEvent[]
): Promise<void> {
  if (events.length === 0) return;

  const { error } = await supabase.rpc("record_learning_events", { p_events: events });
  if (error) {
    console.warn(`[evidence-recorder] record_learning_events falhou: ${error.message}`);
    return;
  }

  const conceptIds = [...new Set(events.map((e) => e.concept_id))];
  await Promise.all(conceptIds.map((id) => recomputeMastery(supabase, id)));
}

/**
 * Recomputa o dominio de UM conceito a partir do historico completo de eventos.
 *
 * Replay em vez de update incremental: e o que garante a propriedade central do
 * sistema (estado sempre recomputavel a partir da evidencia). Quando o modelo
 * mudar, o mesmo codigo roda em batch sobre tudo e o produto melhora
 * retroativamente. Ver docs/LEARNING_GRAPH.md.
 *
 * TODO(claude-code): quando o historico por conceito passar de ~200 eventos,
 * trocar por janela deslizante + checkpoint. Ate la, replay direto ta barato.
 */
export async function recomputeMastery(
  supabase: SupabaseClient,
  conceptId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("learning_events")
    .select("signal, confidence, difficulty")
    .eq("concept_id", conceptId)
    .order("occurred_at", { ascending: true });

  if (error || !data) return;

  const { mastery, confidence } = replayMastery(data as LearningEvent[]);

  const { data: current } = await supabase
    .from("concept_mastery")
    .select("review_interval_days")
    .eq("concept_id", conceptId)
    .maybeSingle();

  const { intervalDays, nextReviewAt } = nextReview(
    mastery,
    current?.review_interval_days ?? 1
  );

  await supabase.rpc("upsert_concept_mastery", {
    p_concept_id: conceptId,
    p_mastery: mastery,
    p_confidence: confidence,
    p_next_review_at: nextReviewAt.toISOString(),
    p_review_interval_days: intervalDays,
    p_model_version: BKT_MODEL_VERSION,
  });
}
