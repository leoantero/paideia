import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";
import { generateStructuredCompletion } from "@/src/core/ai-integration/anthropic-client";

const MODEL = "claude-sonnet-4-5";

const questionSchema = z.object({
  type: z.enum(["multiple_choice", "open_ended", "true_false"]),
  difficulty: z.coerce.number().min(0).max(1),
  stem: z.string().min(5),
  options: z.array(z.string()).optional(),
  answer_key: z.string().min(1),
  rationale: z.string().optional(),
});
const responseSchema = z.object({ questions: z.array(questionSchema) });

function extractJson(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

/**
 * Gera questões para um conceito. NÃO grava nada: o professor revisa e decide
 * o que entra no banco (o POST de /api/teacher/questions faz a gravação).
 *
 * Questão gerada por IA que entra direto em prova sem revisão humana é
 * exatamente o risco que docs/ARCHITECTURE.md manda evitar — por isso o
 * fluxo é gerar → revisar → adicionar, e não gerar → salvar.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") {
    return NextResponse.json(
      { error: "Only teachers can use the builder." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const conceptId: string | undefined = body?.conceptId;
  const count = Math.min(Math.max(Number(body?.count ?? 3), 1), 5);
  const type: string = body?.type ?? "multiple_choice";

  if (!conceptId) {
    return NextResponse.json(
      { error: "conceptId is required." },
      { status: 400 }
    );
  }

  const { data: concept } = await supabase
    .from("concepts")
    .select(
      "id, code, name, description, subject, grade_year, intrinsic_difficulty"
    )
    .eq("id", conceptId)
    .maybeSingle();

  if (!concept) {
    return NextResponse.json({ error: "Concept not found." }, { status: 404 });
  }

  const typeLabel =
    type === "open_ended"
      ? "discursiva"
      : type === "true_false"
        ? "verdadeiro ou falso"
        : "múltipla escolha com 4 alternativas";

  const systemPrompt = `Você elabora questões de avaliação para professores do ensino fundamental brasileiro. Responda SOMENTE com JSON.

CONCEITO: ${concept.name} (${concept.code})
DESCRIÇÃO: ${concept.description ?? "—"}
ANO: ${concept.grade_year ?? 8}º ano

Gere ${count} questões do tipo ${typeLabel} sobre esse conceito.

Formato:
{"questions":[{"type":"${type}","difficulty":<0..1>,"stem":"<enunciado>","options":["a","b","c","d"],"answer_key":"<resposta correta>","rationale":"<por que essa é a resposta>"}]}

REGRAS:
- Português do Brasil, linguagem adequada ao ${concept.grade_year ?? 8}º ano.
- Enunciado autocontido: o aluno não deve precisar de contexto externo.
- Em múltipla escolha, os distratores têm que ser erros PLAUSÍVEIS (erros que o aluno realmente comete), nunca alternativas absurdas de descarte fácil.
- Em verdadeiro ou falso, "options" deve ser ["Verdadeiro","Falso"] e answer_key uma das duas.
- Em discursiva, omita "options" e use answer_key como gabarito esperado.
- "difficulty" reflete a dificuldade da questão, não a do conceito.
- Nada de conteúdo fora do conceito informado.`;

  let raw: string;
  try {
    raw = await generateStructuredCompletion({
      model: MODEL,
      systemPrompt,
      userContent: `Gere ${count} questões sobre: ${concept.name}`,
      maxTokens: 1600,
    });
  } catch (err) {
    console.error("[teacher/builder] Anthropic API call failed:", err);
    return NextResponse.json(
      {
        error:
          "O gerador está indisponível agora. Tente novamente em instantes.",
      },
      { status: 502 }
    );
  }

  const json = extractJson(raw);
  const parsed = json ? responseSchema.safeParse(JSON.parse(json)) : null;
  if (!parsed?.success) {
    return NextResponse.json(
      { error: "Não consegui montar as questões dessa vez. Tente de novo." },
      { status: 502 }
    );
  }

  return NextResponse.json({ questions: parsed.data.questions, concept });
}
