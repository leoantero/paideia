import { after, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { tagTurn } from "@/src/features/learning-graph/concept-tagger";
import { recordEvidence } from "@/src/features/learning-graph/evidence-recorder";
import { generateTutorResponse } from "@/src/core/ai-integration/anthropic-client";
import { buildSocraticSystemPrompt } from "@/src/features/tutoring/socratic-system-prompt";
import { detectSubject } from "@/src/features/tutoring/curriculum-snippets";
import {
  applySocraticGuard,
  logGuardViolation,
} from "@/src/features/tutoring/socratic-guard";
import {
  appendMessage,
  getOrCreateConversation,
  getRecentMessages,
} from "@/src/features/tutoring/conversation-service";
import { getStudentProfile } from "@/src/features/user-profiles/student-profile-service";
import { checkRateLimit, rateLimitResponse } from "@/src/lib/rate-limit";

/** Rota mais usada do produto — teto generoso, mas existe. Ver rate-limit.ts. */
const RATE_LIMIT = 40;
const RATE_WINDOW_MINUTES = 60;

/**
 * The ONLY route that reads ANTHROPIC_API_KEY (via anthropic-client.ts).
 * Every step here assumes the caller is the authenticated student — RLS on
 * conversations/messages backs that assumption up even if this check were
 * ever bypassed.
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

  if (profile?.role !== "student") {
    return NextResponse.json(
      { error: "Only students can use the tutoring chat." },
      { status: 403 }
    );
  }

  const rate = await checkRateLimit(
    user.id,
    "tutor/chat",
    RATE_LIMIT,
    RATE_WINDOW_MINUTES
  );
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds!);

  const body = await request.json().catch(() => null);
  const message: string | undefined = body?.message;
  const conversationId: string | null = body?.conversationId ?? null;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Message is required." },
      { status: 400 }
    );
  }

  const studentProfile = await getStudentProfile(supabase, user.id);
  const gradeBand = studentProfile?.grade_level ?? "elementary_1";
  const subject = detectSubject(message);

  const conversation = await getOrCreateConversation(
    supabase,
    user.id,
    conversationId,
    subject,
    // primeira mensagem do aluno vira o título da conversa
    message
  );

  await appendMessage(supabase, conversation.id, "student", message);

  const history = await getRecentMessages(supabase, conversation.id);
  const systemPrompt = buildSocraticSystemPrompt(gradeBand, subject);

  let reply: string;
  try {
    reply = await generateTutorResponse(systemPrompt, history);
  } catch (err) {
    console.error("[tutor/chat] Anthropic API call failed:", err);
    return NextResponse.json(
      {
        error: "The tutor is unavailable right now. Please try again shortly.",
      },
      { status: 502 }
    );
  }

  const guarded = applySocraticGuard(reply);
  if (guarded.flagged) {
    logGuardViolation(conversation.id);
  }

  const assistantMessageId = await appendMessage(
    supabase,
    conversation.id,
    "assistant",
    guarded.text
  );
  // Instrumentação do learning graph — FORA do caminho crítico da resposta.
  // Roda depois que a resposta já foi enviada ao aluno; qualquer falha aqui
  // é engolida em tagTurn/recordEvidence e nunca chega ao aluno.
  //
  // A leitura dos conceitos candidatos usa a sessão do aluno (RLS); a ESCRITA
  // da evidência usa service-role com o user.id desta sessão — nunca um id
  // vindo do corpo da requisição. Ver 0013_harden_privileges.sql.
  after(async () => {
    const { events } = await tagTurn({
      supabase,
      studentMessage: message,
      tutorReply: guarded.text,
      subject,
      gradeBand,
      messageId: assistantMessageId,
    });
    await recordEvidence(user.id, events);
  });

  return NextResponse.json({
    conversationId: conversation.id,
    reply: guarded.text,
  });
}
