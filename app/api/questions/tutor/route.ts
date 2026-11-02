import { after, NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentApi } from "@/src/core/auth/require-student-api";
import { generateTutorResponse } from "@/src/core/ai-integration/anthropic-client";
import { tagTurn } from "@/src/features/learning-graph/concept-tagger";
import { recordEvidence } from "@/src/features/learning-graph/evidence-recorder";
import { getQuestionTutorContext } from "@/src/features/questions/question-service";
import {
  appendMessage,
  getRecentMessages,
} from "@/src/features/tutoring/conversation-service";
import {
  buildOpeningTurn,
  buildQuestionTutorPrompt,
  buildRevealedTurn,
  tutorSubjectFor,
  withSyntheticTurns,
} from "@/src/features/tutoring/question-tutor-prompt";
import {
  applySocraticGuard,
  logGuardViolation,
} from "@/src/features/tutoring/socratic-guard";
import { getStudentProfile } from "@/src/features/user-profiles/student-profile-service";
import { rewardTutorSession } from "@/src/features/gamification/gamification-service";
import { checkRateLimit, rateLimitResponse } from "@/src/lib/rate-limit";

const RATE_LIMIT = 40;
const RATE_WINDOW_MINUTES = 60;

/**
 * Conversa do tutor sobre uma questão respondida.
 *
 * - Sem `conversationId`: abre a conversa. No erro, a coruja pergunta por que
 *   o aluno escolheu aquela alternativa — o aluno não precisa digitar nada.
 *   Se a tentativa já tem conversa, devolve a última fala dela.
 * - `event: "revealed"`: o aluno tocou em "Ver resposta"; a coruja segue a
 *   partir do gabarito.
 * - `message`: turno normal do aluno.
 *
 * A conversa é gravada em conversations/messages como as do Tutor (aparece
 * no histórico), e os turnos do aluno passam pelo etiquetador em after().
 */
const bodySchema = z.object({
  attemptId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000).optional(),
  event: z.enum(["revealed"]).optional(),
});

export async function POST(request: Request) {
  const auth = await requireStudentApi();
  if ("error" in auth) return auth.error;
  const { supabase, userId } = auth;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { attemptId, message, event } = body.data;

  const rate = await checkRateLimit(
    userId,
    "questions/tutor",
    RATE_LIMIT,
    RATE_WINDOW_MINUTES
  );
  if (!rate.allowed)
    return rateLimitResponse(rate.retryAfterSeconds!, rate.kind);

  const ctx = await getQuestionTutorContext(attemptId, userId);
  if (!ctx) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  const subject = tutorSubjectFor(ctx.question.subject);
  let conversationId = body.data.conversationId ?? null;

  if (conversationId) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, question_attempt_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv || conv.question_attempt_id !== attemptId) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }
  } else {
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("question_attempt_id", attemptId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing && !message && !event) {
      const history = await getRecentMessages(supabase, existing.id);
      const last = [...history].reverse().find((m) => m.role === "assistant");
      return NextResponse.json({
        conversationId: existing.id,
        reply: last?.content ?? null,
        reward: { awarded: false },
      });
    }

    if (existing) {
      conversationId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          student_id: userId,
          subject,
          title:
            `${ctx.question.exam_label} · questão ${ctx.question.item_number}`.slice(
              0,
              80
            ),
          question_attempt_id: attemptId,
        })
        .select("id")
        .single();
      if (error || !created) {
        throw new Error(`Failed to create conversation: ${error?.message}`);
      }
      conversationId = created.id as string;
    }
  }

  if (message) {
    await appendMessage(supabase, conversationId!, "student", message);
  }

  const studentProfile = await getStudentProfile(supabase, userId);
  const gradeBand = studentProfile?.grade_level ?? "elementary_2";
  const history = await getRecentMessages(supabase, conversationId!);
  const turns = withSyntheticTurns(
    buildOpeningTurn(ctx),
    history,
    event === "revealed" ? buildRevealedTurn(ctx) : undefined
  );

  let reply: string;
  try {
    reply = await generateTutorResponse(
      buildQuestionTutorPrompt(gradeBand, ctx),
      turns
    );
  } catch (err) {
    console.error("[questions/tutor] Anthropic API call failed:", err);
    return NextResponse.json(
      {
        error:
          "A coruja não está disponível agora. Tente de novo em instantes.",
      },
      { status: 502 }
    );
  }

  const guarded = applySocraticGuard(reply);
  if (guarded.flagged) logGuardViolation(conversationId!);

  const assistantMessageId = await appendMessage(
    supabase,
    conversationId!,
    "assistant",
    guarded.text
  );

  if (message) {
    after(async () => {
      const { events } = await tagTurn({
        supabase,
        studentMessage: message,
        tutorReply: guarded.text,
        // a matéria exata da questão (ex.: chemistry), que é como os
        // conceitos estão cadastrados — não o balde do prompt
        subject: ctx.question.subject,
        gradeBand,
        messageId: assistantMessageId,
      });
      await recordEvidence(userId, events);
    });
  }

  const reward = message
    ? await rewardTutorSession(supabase, conversationId!)
    : { awarded: false };

  return NextResponse.json({ conversationId, reply: guarded.text, reward });
}
