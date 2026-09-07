import { admin, loadAuthUsers } from "./lib/admin";
import {
  replayMastery,
  nextReview,
  BKT_MODEL_VERSION,
} from "../src/features/learning-graph/bkt";
import type {
  EvidenceSignal,
  EvidenceSource,
} from "../src/features/learning-graph/types";

interface SeedEvent {
  source: EvidenceSource;
  signal: EvidenceSignal;
  confidence: number;
  difficulty: number;
  occurred_at: string;
}

/**
 * Popula learning_events + concept_mastery com uma trilha plausível pra cada
 * aluno da demo — sem isso Painel (responsável), Conselheiro e o heatmap do
 * professor ficam todos em estado vazio, e não dá pra demonstrar o produto.
 *
 * IMPORTANTE: mastery é sempre derivado via bkt.ts (replayMastery), nunca
 * digitado à mão — é a mesma invariante de docs/LEARNING_GRAPH.md
 * ("concept_mastery é 100% recomputável dos eventos") aplicada ao seed.
 *
 * Idempotente por (student, concept): pula se já existir evidência ali.
 */

const STUDENT_MATRICULAS = [
  "20250801", // Marina Rocha
  "20250802", // Théo Almeida
  "20250803", // Bruna Carvalho
  "20250804", // Igor Nascimento
  "20250805", // Lívia Fernandes
];

const studentEmail = (matricula: string) => `${matricula}@aluno.paideia.app`;

interface ConceptPlan {
  code: string;
  n: number;
  successRate: number;
}

// Narrativa: Bruna tem base fraca em frações que se propaga (FRACOP -> VALNUM
// -> EQ1 -> FUNAF), o que dá ao Conselheiro/diagnose_weak_prerequisites algo
// real pra explicar. Igor tem poucas sessões no total ("poucos dados"). VOL e
// INEQ ficam baixos pra todo mundo — conteúdo ainda não trabalhado em sala,
// aparece como "a turma não fixou" no heatmap do professor.
const PLAN: Record<string, ConceptPlan[]> = {
  "20250801": [
    { code: "EF06MA-FRAC", n: 10, successRate: 0.85 },
    { code: "EF07MA-FRACOP", n: 9, successRate: 0.85 },
    { code: "EF07MA-INT", n: 8, successRate: 0.8 },
    { code: "EF08MA06", n: 8, successRate: 0.8 },
    { code: "EF08MA07", n: 7, successRate: 0.75 },
    { code: "EF08MA-FUNAF", n: 6, successRate: 0.75 },
    { code: "EF07MA-ANG", n: 6, successRate: 0.8 },
    { code: "EF08MA15", n: 5, successRate: 0.75 },
    { code: "EF08MA-AREA", n: 5, successRate: 0.7 },
    { code: "EF08MA22", n: 4, successRate: 0.7 },
    { code: "EF08MA-VOL", n: 2, successRate: 0.2 },
    { code: "EF08MA-INEQ", n: 1, successRate: 0.15 },
  ],
  "20250802": [
    { code: "EF06MA-FRAC", n: 7, successRate: 0.6 },
    { code: "EF07MA-FRACOP", n: 6, successRate: 0.55 },
    { code: "EF07MA-INT", n: 6, successRate: 0.65 },
    { code: "EF08MA06", n: 5, successRate: 0.5 },
    { code: "EF08MA07", n: 5, successRate: 0.5 },
    { code: "EF07MA-ANG", n: 5, successRate: 0.65 },
    { code: "EF08MA14", n: 4, successRate: 0.6 },
    { code: "EF08MA-VOL", n: 1, successRate: 0.2 },
    { code: "EF08MA-INEQ", n: 1, successRate: 0.15 },
  ],
  "20250803": [
    { code: "EF06MA-FRAC", n: 8, successRate: 0.25 },
    { code: "EF07MA-FRACOP", n: 7, successRate: 0.3 },
    { code: "EF08MA06", n: 6, successRate: 0.35 },
    { code: "EF08MA07", n: 5, successRate: 0.35 },
    { code: "EF08MA-FUNAF", n: 4, successRate: 0.3 },
    { code: "EF07MA-ANG", n: 5, successRate: 0.6 },
    { code: "EF08MA15", n: 4, successRate: 0.55 },
    { code: "EF08MA-VOL", n: 1, successRate: 0.15 },
    { code: "EF08MA-INEQ", n: 1, successRate: 0.15 },
  ],
  "20250804": [
    { code: "EF06MA-FRAC", n: 2, successRate: 0.5 },
    { code: "EF07MA-INT", n: 1, successRate: 0.5 },
    { code: "EF08MA-VOL", n: 1, successRate: 0.2 },
  ],
  "20250805": [
    { code: "EF06MA-FRAC", n: 6, successRate: 0.7 },
    { code: "EF07MA-FRACOP", n: 5, successRate: 0.65 },
    { code: "EF07MA-INT", n: 5, successRate: 0.7 },
    { code: "EF07MA-ANG", n: 5, successRate: 0.75 },
    { code: "EF08MA-POL", n: 4, successRate: 0.6 },
    { code: "EF08MA-VOL", n: 1, successRate: 0.2 },
    { code: "EF08MA-INEQ", n: 1, successRate: 0.15 },
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function craftEvents(
  n: number,
  successRate: number,
  difficulty: number
): SeedEvent[] {
  const events: SeedEvent[] = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    let signal: EvidenceSignal;
    if (roll < successRate) {
      signal = pick<EvidenceSignal>(["correct", "correct", "insight"]);
    } else if (roll < successRate + (1 - successRate) * 0.25) {
      signal = "partial";
    } else {
      signal = pick<EvidenceSignal>(["incorrect", "struggling"]);
    }
    const source: EvidenceSource =
      i % 4 === 3 ? "retrieval_review" : "tutor_turn";
    const confidence =
      source === "retrieval_review"
        ? randBetween(0.8, 0.95)
        : randBetween(0.35, 0.6);
    // espalha ao longo dos últimos ~30 dias, mais recente por último
    const daysAgo =
      Math.round(((n - i) / n) * 28) + Math.floor(Math.random() * 2);
    events.push({
      source,
      signal,
      confidence: Number(confidence.toFixed(2)),
      difficulty: Number(
        Math.min(Math.max(difficulty + randBetween(-0.1, 0.1), 0), 1).toFixed(2)
      ),
      occurred_at: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  return events;
}

async function main() {
  const users = await loadAuthUsers();

  const allCodes = [
    ...new Set(
      Object.values(PLAN)
        .flat()
        .map((p) => p.code)
    ),
  ];
  const { data: concepts, error } = await admin
    .from("concepts")
    .select("id, code, intrinsic_difficulty")
    .in("code", allCodes);
  if (error || !concepts)
    throw error ?? new Error("Falha ao carregar concepts.");
  const conceptByCode = new Map(concepts.map((c) => [c.code, c]));

  let totalEvents = 0;
  let totalConcepts = 0;

  for (const matricula of STUDENT_MATRICULAS) {
    const user = users.get(studentEmail(matricula).toLowerCase());
    if (!user) {
      console.warn(`[seed-learning-data] usuário não encontrado: ${matricula}`);
      continue;
    }
    const plans = PLAN[matricula] ?? [];

    for (const plan of plans) {
      const concept = conceptByCode.get(plan.code);
      if (!concept) {
        console.warn(
          `[seed-learning-data] concept não encontrado: ${plan.code}`
        );
        continue;
      }

      const { count } = await admin
        .from("learning_events")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("concept_id", concept.id);
      if (count && count > 0) continue; // idempotente

      const seedEvents = craftEvents(
        plan.n,
        plan.successRate,
        concept.intrinsic_difficulty ?? 0.5
      );
      const rows = seedEvents.map((e) => ({
        student_id: user.id,
        concept_id: concept.id,
        source: e.source,
        signal: e.signal,
        confidence: e.confidence,
        difficulty: e.difficulty,
        occurred_at: e.occurred_at,
        metadata: { seed: true },
      }));

      const { error: insertError } = await admin
        .from("learning_events")
        .insert(rows);
      if (insertError) throw insertError;
      totalEvents += rows.length;

      const { mastery, confidence } = replayMastery(
        seedEvents
          .slice()
          .sort(
            (a, b) =>
              new Date(a.occurred_at).getTime() -
              new Date(b.occurred_at).getTime()
          )
      );
      const { intervalDays, nextReviewAt } = nextReview(mastery, 1);

      const { error: upsertError } = await admin.from("concept_mastery").upsert(
        {
          student_id: user.id,
          concept_id: concept.id,
          mastery,
          confidence,
          evidence_count: rows.length,
          last_evidence_at: new Date().toISOString(),
          next_review_at: nextReviewAt.toISOString(),
          review_interval_days: intervalDays,
          model_version: BKT_MODEL_VERSION,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,concept_id" }
      );
      if (upsertError) throw upsertError;
      totalConcepts += 1;
    }
    console.log(`${matricula}: ok`);
  }

  console.log(
    `\n${totalEvents} learning_events criados, ${totalConcepts} concept_mastery calculados.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
