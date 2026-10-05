import { NextResponse } from "next/server";
import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import {
  generateTutorResponse,
  type TutorMessage,
} from "@/src/core/ai-integration/anthropic-client";
import { buildAdvisorSystemPrompt } from "@/src/features/user-profiles/advisor-system-prompt";
import { getMasteryBySubject } from "@/src/features/user-profiles/parent-profile-service";
import type { WeakPrerequisite } from "@/src/features/learning-graph/types";
import { checkRateLimit, rateLimitResponse } from "@/src/lib/rate-limit";

const HISTORY_LIMIT = 10;
const RATE_LIMIT = 20;
const RATE_WINDOW_MINUTES = 60;

/**
 * O "Conselheiro" do responsável. Não é o tutor socrático do aluno — não
 * grava learning_events, não é anexado a `conversations`/`messages`, e não
 * lê nada além do agregado (concept_mastery + pré-requisitos fracos). Ver
 * src/features/user-profiles/advisor-system-prompt.ts.
 */
export async function POST(request: Request) {
  const { supabase, user } = await getVerifiedUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent") {
    return NextResponse.json(
      { error: "Only parents can use the advisor." },
      { status: 403 }
    );
  }

  const rate = await checkRateLimit(
    user.id,
    "parent/advisor",
    RATE_LIMIT,
    RATE_WINDOW_MINUTES
  );
  if (!rate.allowed)
    return rateLimitResponse(rate.retryAfterSeconds!, rate.kind);

  const body = await request.json().catch(() => null);
  const studentId: string | undefined = body?.studentId;
  const childFirstName: string = (body?.childFirstName ?? "seu filho").split(
    " "
  )[0];
  const history: TutorMessage[] = Array.isArray(body?.history)
    ? body.history
    : [];
  const message: string | undefined = body?.message;

  if (
    !studentId ||
    !message ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return NextResponse.json(
      { error: "studentId and message are required." },
      { status: 400 }
    );
  }

  // RLS (`students_select_linked_parent`) é o que realmente barra acesso a um
  // filho de outra família — isto só transforma "linha vazia" em erro claro.
  const { data: link } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (!link) {
    return NextResponse.json(
      { error: "Child not found or not linked to this account." },
      { status: 403 }
    );
  }

  const masteryMap = await getMasteryBySubject(supabase, [studentId]);
  const masteryBySubject = masteryMap.get(studentId) ?? [];

  let weakPrerequisites: WeakPrerequisite[] = [];
  const { data: weakest } = await supabase
    .from("concept_mastery")
    .select("concept_id, mastery")
    .eq("student_id", studentId)
    .gt("evidence_count", 0)
    .order("mastery", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (weakest) {
    const { data: diagnosis } = await supabase.rpc(
      "diagnose_weak_prerequisites",
      {
        p_student_id: studentId,
        p_concept_id: weakest.concept_id,
      }
    );
    weakPrerequisites = (diagnosis ?? []) as WeakPrerequisite[];
  }

  const systemPrompt = buildAdvisorSystemPrompt(
    childFirstName,
    masteryBySubject,
    weakPrerequisites
  );

  const trimmedHistory = [
    ...history.slice(-HISTORY_LIMIT),
    { role: "user" as const, content: message },
  ];

  let reply: string;
  try {
    reply = await generateTutorResponse(systemPrompt, trimmedHistory);
  } catch (err) {
    console.error("[parent/advisor] Anthropic API call failed:", err);
    return NextResponse.json(
      {
        error:
          "O conselheiro está indisponível agora. Tente novamente em instantes.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ reply });
}
