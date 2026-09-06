import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GradeBand } from "@/src/core/auth/types";
import { generateStructuredCompletion } from "@/src/core/ai-integration/anthropic-client";
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

/** Teto de confianca pra evidencia vinda de chat -- ruidoso por natureza. */
const TUTOR_TURN_CONFIDENCE_CAP = 0.6;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

const taggerEventSchema = z.object({
  concept_id: z.string(),
  signal: z.enum(["correct", "partial", "incorrect", "struggling", "insight"]),
  confidence: z.coerce.number(),
  difficulty: z.coerce.number().optional(),
});

const taggerResponseSchema = z.object({
  events: z.array(taggerEventSchema),
});

/** Extrai o primeiro bloco `{...}` -- o modelo as vezes embrulha em prosa/markdown. */
function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

/**
 * O TAGGER. Converte um turno de conversa em evidencia ancorada em conceito.
 *
 * Contrato (ver docs/LEARNING_GRAPH.md):
 * - NAO entra no caminho critico -- o chamador dispara via `after()`.
 * - Falha NUNCA derruba o chat: qualquer erro -> { events: [], conceptIds: [] } + log.
 * - Descarta todo concept_id que nao esteja nos candidatos (modelo alucina uuid;
 *   isso e integridade referencial, nao opcional).
 * - confidence de 'tutor_turn' fica no teto de 0.6.
 */
export async function tagTurn(args: {
  supabase: SupabaseClient;
  studentMessage: string;
  tutorReply: string;
  subject: string;
  gradeBand: GradeBand;
  messageId: string;
}): Promise<TaggedEvidence> {
  const empty: TaggedEvidence = { events: [], conceptIds: [] };

  try {
    const candidates = await getCandidateConcepts(
      args.supabase,
      args.subject,
      args.gradeBand
    );
    if (candidates.length === 0) return empty;

    const validIds = new Set(candidates.map((c) => c.id));
    const difficultyById = new Map(
      candidates.map((c) => [c.id, c.intrinsic_difficulty])
    );

    const raw = await generateStructuredCompletion({
      model: TAGGER_MODEL,
      systemPrompt: buildTaggerPrompt(candidates),
      userContent: `TURNO:\nAluno: ${args.studentMessage}\nTutor: ${args.tutorReply}`,
      maxTokens: 400,
    });

    const jsonText = extractJsonObject(raw);
    if (!jsonText) {
      console.warn("[concept-tagger] resposta sem JSON parseavel; turno ignorado");
      return empty;
    }

    const parsed = taggerResponseSchema.safeParse(JSON.parse(jsonText));
    if (!parsed.success) {
      console.warn(`[concept-tagger] JSON fora do schema: ${parsed.error.message}`);
      return empty;
    }

    const seen = new Set<string>();
    const events: LearningEvent[] = [];

    for (const e of parsed.data.events) {
      // integridade referencial: uuid alucinado nao entra, ponto final
      if (!validIds.has(e.concept_id) || seen.has(e.concept_id)) continue;
      seen.add(e.concept_id);

      events.push({
        concept_id: e.concept_id,
        source: "tutor_turn",
        signal: e.signal,
        // floor em 0.05: a coluna tem check (confidence > 0)
        confidence: Math.min(
          Math.max(clamp01(e.confidence), 0.05),
          TUTOR_TURN_CONFIDENCE_CAP
        ),
        difficulty:
          e.difficulty !== undefined
            ? clamp01(e.difficulty)
            : difficultyById.get(e.concept_id),
        source_ref: args.messageId,
        metadata: { subject: args.subject },
      });
    }

    return { events, conceptIds: events.map((e) => e.concept_id) };
  } catch (err) {
    console.warn(`[concept-tagger] falhou (nao-fatal): ${(err as Error).message}`);
    return empty;
  }
}
