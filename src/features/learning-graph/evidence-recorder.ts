import "server-only";
import type { LearningEvent } from "./types";
import { BKT_MODEL_VERSION, nextReview, replayMastery } from "./bkt";
import { createAdminClient } from "@/src/lib/supabase/admin";

/**
 * Grava evidencia e reprocessa o dominio dos conceitos tocados.
 *
 * ESCRITA PRIVILEGIADA: usa o cliente service-role (src/lib/supabase/admin.ts),
 * nao a sessao do aluno. O `studentId` vem SEMPRE da sessao autenticada da
 * rota, nunca do corpo da requisicao. Antes de 0013 isso era uma RPC liberada
 * para `authenticated` e o proprio aluno conseguia forjar o proprio dominio.
 *
 * Nao-fatal por design: se a instrumentacao falhar, o chat continua. Perder um
 * evento e ruim; derrubar a aula do aluno e pior.
 */
export async function recordEvidence(
  studentId: string,
  events: LearningEvent[]
): Promise<void> {
  if (events.length === 0) return;

  const admin = createAdminClient();

  const rows = events.map((e) => ({
    student_id: studentId,
    concept_id: e.concept_id,
    source: e.source,
    signal: e.signal,
    confidence: e.confidence,
    difficulty: e.difficulty ?? null,
    source_ref: e.source_ref ?? null,
    metadata: e.metadata ?? {},
  }));

  const { error } = await admin.from("learning_events").insert(rows);
  if (error) {
    console.warn(
      `[evidence-recorder] insert de learning_events falhou: ${error.message}`
    );
    return;
  }

  const conceptIds = [...new Set(events.map((e) => e.concept_id))];
  await Promise.all(conceptIds.map((id) => recomputeMastery(studentId, id)));
}

/**
 * Recomputa o dominio de UM conceito a partir do historico completo de eventos
 * DAQUELE aluno.
 *
 * Replay em vez de update incremental: e o que garante a propriedade central do
 * sistema (estado sempre recomputavel a partir da evidencia). Quando o modelo
 * mudar, o mesmo codigo roda em batch sobre tudo e o produto melhora
 * retroativamente. Ver docs/LEARNING_GRAPH.md.
 *
 * NOTA: antes de 0013 este replay filtrava so por concept_id, sem student_id.
 * Rodando com a sessao do aluno a RLS mascarava o bug (so as linhas dele
 * voltavam); com service-role ele misturaria a turma inteira num numero so.
 * O filtro por aluno agora e explicito.
 *
 * TODO(claude-code): quando o historico por conceito passar de ~200 eventos,
 * trocar por janela deslizante + checkpoint. Ate la, replay direto ta barato.
 */
export async function recomputeMastery(
  studentId: string,
  conceptId: string
): Promise<void> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("learning_events")
    .select("signal, confidence, difficulty")
    .eq("student_id", studentId)
    .eq("concept_id", conceptId)
    .order("occurred_at", { ascending: true });

  if (error || !data || data.length === 0) return;

  const { mastery, confidence } = replayMastery(data as LearningEvent[]);

  const { data: current } = await admin
    .from("concept_mastery")
    .select("review_interval_days")
    .eq("student_id", studentId)
    .eq("concept_id", conceptId)
    .maybeSingle();

  const { intervalDays, nextReviewAt } = nextReview(
    mastery,
    current?.review_interval_days ?? 1
  );

  const { error: upsertError } = await admin.from("concept_mastery").upsert(
    {
      student_id: studentId,
      concept_id: conceptId,
      mastery,
      confidence,
      // contagem real dos eventos replayados — mantem a linha 100% derivavel,
      // diferente do incremento cego que a RPC antiga fazia
      evidence_count: data.length,
      last_evidence_at: new Date().toISOString(),
      next_review_at: nextReviewAt.toISOString(),
      review_interval_days: intervalDays,
      model_version: BKT_MODEL_VERSION,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,concept_id" }
  );

  if (upsertError) {
    console.warn(
      `[evidence-recorder] upsert de concept_mastery falhou: ${upsertError.message}`
    );
  }
}
