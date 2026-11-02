import type { SimulationMeta } from "@/src/features/simulations/catalog";

/**
 * Contexto acrescentado ao prompt socrático quando a conversa nasce de uma
 * simulação. A coruja usa a simulação como laboratório: em vez de explicar,
 * propõe testes que o aluno faz mexendo nela.
 */
export function buildSimulationContext(meta: SimulationMeta): string {
  const challenges = meta.challenges.map((c) => `- ${c.prompt}`).join("\n");
  return `

CONTEXTO: o aluno veio da simulação interativa "${meta.title}" (${meta.grade}, ${meta.topic}): ${meta.description}
Desafios que a simulação propõe:
${challenges}
Use a simulação como laboratório: quando couber, sugira que ele teste uma hipótese mexendo nela ("o que acontece se você…?") e volte para contar o que viu. Alimente a curiosidade; não resolva os desafios por ele.`;
}
