import type { EvidenceSignal, LearningEvent } from "./types";

/**
 * Bayesian Knowledge Tracing -- o modelo de dominio.
 *
 * POR QUE BKT E NAO REDE NEURAL (DKT/SAKT): 4 parametros por conceito,
 * atualizacao online O(1), e posterior interpretavel. "Interpretavel" aqui nao
 * e preciosismo academico -- e requisito comercial: voce vai ter que explicar
 * o numero pra uma coordenadora pedagogica cetica, e "a rede disse" nao passa.
 * Alem disso voce nao tem dado pra treinar rede ainda; BKT com prior decente
 * ganha de rede mal treinada com folga. Migre quando tiver volume real.
 *
 * Sem I/O de proposito: funcao pura, testavel sem banco, e da pra rodar em
 * batch pra recomputar todo o historico quando o modelo mudar.
 */

export interface BktParams {
  /** P(ja domina antes de qualquer evidencia). */
  pInit: number;
  /** P(aprende entre uma oportunidade e outra). */
  pLearn: number;
  /** P(acerta sem dominar) -- chute. */
  pGuess: number;
  /** P(erra dominando) -- vacilo. */
  pSlip: number;
}

export const DEFAULT_BKT_PARAMS: BktParams = {
  pInit: 0.15,
  pLearn: 0.12,
  pGuess: 0.2,
  pSlip: 0.1,
};

export const BKT_MODEL_VERSION = "bkt-v1";

/**
 * Traduz o sinal qualitativo em "isso foi um acerto?" mais um peso.
 * 'insight' vale mais que 'correct': chegar sozinho na conclusao e a evidencia
 * mais forte de dominio que existe no chat socratico -- e literalmente o que o
 * metodo esta tentando produzir.
 */
export function signalToObservation(signal: EvidenceSignal): {
  correct: boolean;
  weight: number;
} {
  switch (signal) {
    case "insight":
      return { correct: true, weight: 1.0 };
    case "correct":
      return { correct: true, weight: 0.8 };
    case "partial":
      return { correct: true, weight: 0.4 };
    case "incorrect":
      return { correct: false, weight: 0.8 };
    case "struggling":
      return { correct: false, weight: 0.5 };
  }
}

/**
 * Ajusta os parametros pela dificuldade do item. Conceito dificil: chute rende
 * menos, vacilo acontece mais. Sem isso, acertar o trivial infla o dominio.
 */
function adjustForDifficulty(params: BktParams, difficulty?: number): BktParams {
  if (difficulty === undefined) return params;
  const d = Math.min(Math.max(difficulty, 0), 1);
  return {
    ...params,
    pGuess: params.pGuess * (1 - 0.6 * d),
    pSlip: params.pSlip * (1 + 0.6 * d),
  };
}

/**
 * Um passo de atualizacao do BKT.
 *
 * `evidenceConfidence` (0..1) faz a interpolacao entre o posterior puro e o
 * prior: evidencia de chat e ruidosa e NAO pode mover o dominio tanto quanto
 * um item de prova. Essa e a diferenca entre um numero que a coordenacao
 * confia e um numero que ela descarta na primeira reuniao.
 */
export function updateMastery(
  prior: number,
  signal: EvidenceSignal,
  evidenceConfidence: number,
  difficulty?: number,
  params: BktParams = DEFAULT_BKT_PARAMS
): number {
  const p = adjustForDifficulty(params, difficulty);
  const { correct, weight } = signalToObservation(signal);

  // posterior dado a observacao (Bayes)
  let posterior: number;
  if (correct) {
    const num = prior * (1 - p.pSlip);
    posterior = num / (num + (1 - prior) * p.pGuess);
  } else {
    const num = prior * p.pSlip;
    posterior = num / (num + (1 - prior) * (1 - p.pGuess));
  }

  // transicao de aprendizado
  posterior = posterior + (1 - posterior) * p.pLearn;

  // amortece pelo quanto a evidencia vale (confianca x forca do sinal)
  const alpha = Math.min(Math.max(evidenceConfidence * weight, 0), 1);
  const blended = prior + alpha * (posterior - prior);

  return Math.min(Math.max(blended, 0.01), 0.99);
}

/** Recomputa do zero a partir do historico. Usado no backfill quando o modelo muda. */
export function replayMastery(
  events: Pick<LearningEvent, "signal" | "confidence" | "difficulty">[],
  params: BktParams = DEFAULT_BKT_PARAMS
): { mastery: number; confidence: number } {
  let mastery = params.pInit;
  let evidenceMass = 0;

  for (const e of events) {
    mastery = updateMastery(mastery, e.signal, e.confidence, e.difficulty, params);
    evidenceMass += e.confidence;
  }

  // Confianca satura: ~5 unidades de massa de evidencia ja e bastante.
  // Serve pra impedir que mastery=0.9 com 1 evento vire afirmacao no dashboard.
  const confidence = 1 - Math.exp(-evidenceMass / 5);
  return { mastery, confidence };
}

/**
 * Agenda de revisao espacada, derivada do MESMO posterior.
 * Repeticao espacada e diagnostico sao a mesma inferencia -- nao duas features
 * com dois estados que vao divergir.
 */
export function nextReview(
  mastery: number,
  previousIntervalDays: number
): { intervalDays: number; nextReviewAt: Date } {
  // dominio alto estica o intervalo, dominio baixo colapsa pro dia seguinte
  const factor = mastery >= 0.9 ? 2.5 : mastery >= 0.7 ? 1.8 : mastery >= 0.5 ? 1.2 : 0.5;
  const intervalDays = Math.min(Math.max(previousIntervalDays * factor, 1), 180);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + Math.round(intervalDays));
  return { intervalDays, nextReviewAt };
}
