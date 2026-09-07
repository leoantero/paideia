import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import {
  generateTutorResponse,
  type TutorMessage,
} from "@/src/core/ai-integration/anthropic-client";
import {
  getGuardianCoverage,
  getSchoolOverview,
  getSubjectMastery,
  getTeacherEngagement,
} from "@/src/features/user-profiles/gestor-service";
import { checkRateLimit, rateLimitResponse } from "@/src/lib/rate-limit";

const HISTORY_LIMIT = 10;
const RATE_LIMIT = 20;
const RATE_WINDOW_MINUTES = 60;

const SUBJECT_LABELS: Record<string, string> = {
  math: "Matemática",
  language: "Português",
  physics: "Física",
  history: "História",
  biology: "Biologia",
  chemistry: "Química",
};

/**
 * Assistente de insights do gestor.
 *
 * O contexto é montado a partir das MESMAS funções agregadas do dashboard
 * (0015), que já recalculam o escopo por auth.uid() no banco. Ou seja: mesmo
 * que este código tentasse, não haveria como puxar aluno de outra escola —
 * e não há nenhum caminho para `learning_events` ou `messages`.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "director") {
    return NextResponse.json(
      { error: "Only school managers can use insights." },
      { status: 403 }
    );
  }

  const rate = await checkRateLimit(
    user.id,
    "gestor/insights",
    RATE_LIMIT,
    RATE_WINDOW_MINUTES
  );
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds!);

  const body = await request.json().catch(() => null);
  const message: string | undefined = body?.message;
  const history: TutorMessage[] = Array.isArray(body?.history)
    ? body.history
    : [];

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      { error: "Message is required." },
      { status: 400 }
    );
  }

  const [overview, teachers, subjects, guardians] = await Promise.all([
    getSchoolOverview(supabase),
    getTeacherEngagement(supabase),
    getSubjectMastery(supabase),
    getGuardianCoverage(supabase),
  ]);

  const teacherLines =
    teachers.length === 0
      ? "Nenhum professor com turma atribuída."
      : teachers
          .map(
            (t) =>
              `- ${t.teacherName}: ${t.sessionsPerStudent.toFixed(1)} sessões/aluno (7d), ${t.classes} turma(s), ${t.students} alunos`
          )
          .join("\n");

  const subjectLines =
    subjects.length === 0
      ? "Ainda sem evidência suficiente."
      : subjects
          .map(
            (s) =>
              `- ${SUBJECT_LABELS[s.subject] ?? s.subject}: ${s.avgMasteryPct}% de domínio médio (${s.students} alunos, ${s.conceptsTracked} conceitos)`
          )
          .join("\n");

  const systemPrompt = `Você é o assistente de gestão do Paideia, falando com o gestor de uma escola. Responda sempre em português do Brasil.

Você enxerga APENAS os agregados abaixo. Não tem acesso a conversas de alunos, a eventos individuais de aprendizagem nem a dados de alunos de outras unidades — e deve dizer isso se perguntarem.

USO DA UNIDADE (últimos 7 dias):
- ${overview.activeStudents} alunos com matrícula ativa
- ${overview.studentsActive7d} alunos estudaram na semana
- ${overview.sessions7d} sessões de estudo registradas
- ${overview.teachers} professores com turma atribuída
- ${overview.linkedGuardians} responsáveis com conta vinculada

ENGAJAMENTO POR PROFESSOR:
${teacherLines}

DOMÍNIO MÉDIO POR MATÉRIA:
${subjectLines}

COBERTURA DE RESPONSÁVEIS:
- ${guardians.withGuardian} de ${guardians.total} alunos têm responsável vinculado (${guardians.withoutGuardian} sem)

REGRAS:
1. Baseie-se só nos números acima. Não invente dados que não estão aqui.
2. Se a base for pequena, diga com transparência que a amostra ainda é curta em vez de fingir tendência.
3. Seja direto e prático: o gestor quer saber onde agir, não uma aula.
4. Respostas de 2 a 5 frases, salvo se pedirem detalhamento.
5. Nunca cite alunos individualmente — você não tem esse dado e não deveria ter.`;

  const trimmed = [
    ...history.slice(-HISTORY_LIMIT),
    { role: "user" as const, content: message },
  ];

  let reply: string;
  try {
    reply = await generateTutorResponse(systemPrompt, trimmed);
  } catch (err) {
    console.error("[gestor/insights] Anthropic API call failed:", err);
    return NextResponse.json(
      {
        error:
          "O assistente está indisponível agora. Tente novamente em instantes.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ reply });
}
