import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GradeBand } from "@/src/core/auth/types";
import type { Concept, LearningEvent } from "./types";

/**
 * O TAGGER: converte um turno de conversa em evidencia ancorada em conceito.
 *
 * Esta e A peca que transforma transcricao (que nao vale nada) em dado de
 * aprendizagem (que e a empresa). Substitui o detectSubject() por keyword de
 * curriculum-snippets.ts, que joga tudo em 5 baldes e perde toda a informacao.
 *
 * DUAS REGRAS INEGOCIAVEIS:
 *
 * 1. NAO ENTRA NO CAMINHO CRITICO. O aluno nao pode esperar o tagger pra
 *    receber a resposta socratica. Dispare em paralelo, persista quando voltar.
 *    Ver app/api/tutor/chat/route.ts.
 *
 * 2. MODELO PEQUENO E BARATO. Isso roda em todo turno de todo aluno -- e a
 *    linha de COGS que decide sua margem bruta. Haiku com output estruturado
 *    curto, nao o modelo do tutor.
 */

const TAGGER_MODEL = "claude-haiku-4-5";

export interface TaggedEvidence {
  events: LearningEvent[];
  /** conceitos que apareceram, pro prompt socratico do proximo turno */
  conceptIds: string[];
}

/**
 * Candidatos: so os conceitos plausiveis pra serie/materia do aluno.
 * Nunca mande o grafo inteiro pro modelo -- alem de caro, piora a precisao.
 */
export async function getCandidateConcepts(
  supabase: SupabaseClient,
  subject: string,
  gradeBand: GradeBand,
  limit = 40
): Promise<Concept[]> {
  const { data } = await supabase
    .from("concepts")
    .select("id, code, name, subject, grade_band, grade_year, description, intrinsic_difficulty")
    .eq("subject", subject)
    .eq("grade_band", gradeBand)
    .limit(limit);

  return (data ?? []) as Concept[];
}

export function buildTaggerPrompt(candidates: Concept[]): string {
  const list = candidates.map((c) => `${c.id} | ${c.code} | ${c.name}`).join("\n");

  return `Voce classifica turnos de tutoria em evidencia de aprendizagem.

Dado um turno (aluno + tutor), identifique quais conceitos da lista foram
efetivamente exercitados e que sinal o ALUNO deu sobre cada um.

CONCEITOS DISPONIVEIS (id | codigo | nome):
${list}

Responda SOMENTE com JSON, no formato:
{"events":[{"concept_id":"<uuid da lista>","signal":"correct|partial|incorrect|struggling|insight","confidence":<0..1>,"difficulty":<0..1>}]}

REGRAS:
- Use apenas concept_id que esteja na lista. Nada fora dela.
- Se nenhum conceito da lista foi exercitado, devolva {"events":[]}. Isso e
  comum e esperado -- nao force uma classificacao.
- "insight" so quando o aluno chegou sozinho na conclusao, nao quando o tutor
  entregou. Esse sinal e o mais forte que existe; nao inflacione.
- "struggling" quando travou, repetiu erro ou pediu a resposta pronta.
- confidence e o quanto VOCE confia na leitura. Turno curto ou ambiguo: <= 0.4.
- Uma pergunta do aluno, sozinha, nao e evidencia de dominio. So conta o que
  ele produziu de raciocinio.`;
}

/**
 * TODO(claude-code): implementar.
 *
 * 1. montar candidatos via getCandidateConcepts()
 * 2. chamar TAGGER_MODEL com buildTaggerPrompt() + o turno (aluno e tutor)
 * 3. parsear o JSON com zod (ja e dependencia do projeto)
 * 4. DESCARTAR qualquer concept_id que nao esteja em candidates -- o modelo
 *    alucina uuid; isso nao e opcional, e integridade referencial
 * 5. clampar confidence em [0,1] e teto de 0.6 pra source 'tutor_turn'
 *    (chat e ruidoso por natureza -- ver docs/LEARNING_GRAPH.md)
 * 6. devolver com source='tutor_turn' e source_ref = id da mensagem
 *
 * Falha do tagger NAO pode derrubar o chat: devolva { events: [], conceptIds: [] }
 * e logue. O aluno nunca pode ver um erro porque a instrumentacao caiu.
 */
export async function tagTurn(_args: {
  supabase: SupabaseClient;
  studentMessage: string;
  tutorReply: string;
  subject: string;
  gradeBand: GradeBand;
  messageId: string;
}): Promise<TaggedEvidence> {
  throw new Error("Nao implementado -- ver docs/LEARNING_GRAPH.md, passo 3");
}
