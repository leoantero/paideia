import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentApi } from "@/src/core/auth/require-student-api";
import {
  generateStructured,
  type TutorMessage,
} from "@/src/core/ai-integration/anthropic-client";
import { applySocraticGuard } from "@/src/features/tutoring/socratic-guard";
import { getStudentProfile } from "@/src/features/user-profiles/student-profile-service";
import { checkRateLimit, rateLimitResponse } from "@/src/lib/rate-limit";
import {
  EVALUATION_TOOL,
  MAX_OPEN_ATTEMPTS,
  buildEvaluationSystemPrompt,
  evaluationSchema,
  resolveOpenAttempt,
} from "@/src/features/spaced-repetition/open-answer-evaluation";
import {
  ReviewRejectedError,
  getCardForEvaluation,
  recordReview,
} from "@/src/features/spaced-repetition/study-service";

/** Each call is a model call; a full session is ~20 cards × up to 3 attempts. */
const RATE_LIMIT = 60;
const RATE_WINDOW_MINUTES = 60;

const bodySchema = z.object({
  cardId: z.string().min(1),
  // Earlier turns of this card's exchange (student answers and tutor questions).
  history: z
    .array(
      z.object({
        role: z.enum(["student", "tutor"]),
        content: z.string().max(1000),
      })
    )
    .max((MAX_OPEN_ATTEMPTS - 1) * 2),
  answer: z.string().trim().min(1).max(1000),
  durationMs: z.number().int().min(0),
});

/**
 * Open cards: the tutor evaluates the student's explanation Socratically.
 * Not final → one guiding question comes back. Final → the review is
 * recorded with the resulting grade and the reference answer is revealed.
 */
export async function POST(request: Request) {
  const auth = await requireStudentApi();
  if ("error" in auth) return auth.error;

  const rate = await checkRateLimit(
    auth.userId,
    "study/open",
    RATE_LIMIT,
    RATE_WINDOW_MINUTES
  );
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds!);

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid answer." }, { status: 400 });
  }
  const { cardId, history, answer, durationMs } = body.data;

  const card = await getCardForEvaluation(auth.supabase, cardId);
  if (!card || card.kind !== "open") {
    return NextResponse.json({ error: "Card not available." }, { status: 404 });
  }

  const profile = await getStudentProfile(auth.supabase, auth.userId);
  const attempt = history.filter((m) => m.role === "student").length + 1;

  const messages: TutorMessage[] = [
    ...history.map((m): TutorMessage => ({
      role: m.role === "student" ? "user" : "assistant",
      content: m.content,
    })),
    { role: "user", content: answer },
  ];

  let evaluation;
  try {
    const raw = await generateStructured(
      buildEvaluationSystemPrompt(profile?.grade_level ?? "elementary_1", card),
      messages,
      EVALUATION_TOOL
    );
    evaluation = evaluationSchema.parse(raw);
  } catch (err) {
    console.error(
      "[study/open] evaluation failed:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      {
        error:
          "O tutor não conseguiu avaliar agora. Tente de novo em instantes.",
      },
      { status: 502 }
    );
  }

  const outcome = resolveOpenAttempt(evaluation.verdict, attempt);

  if (!outcome.final) {
    const reply = applySocraticGuard(
      [evaluation.feedback, evaluation.follow_up_question]
        .filter(Boolean)
        .join(" ")
    ).text;
    return NextResponse.json({
      final: false,
      verdict: evaluation.verdict,
      reply,
      attempt,
    });
  }

  try {
    const result = await recordReview(
      auth.supabase,
      auth.userId,
      { cardId, grade: outcome.grade, durationMs },
      "revisao_aberta"
    );
    return NextResponse.json({
      final: true,
      verdict: evaluation.verdict,
      reply: evaluation.feedback,
      attempt,
      result,
    });
  } catch (err) {
    if (err instanceof ReviewRejectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
