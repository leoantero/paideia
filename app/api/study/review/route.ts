import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentApi } from "@/src/core/auth/require-student-api";
import {
  ReviewRejectedError,
  recordReview,
} from "@/src/features/spaced-repetition/study-service";

/**
 * Multiple choice and short answer: graded by record_review() in Postgres
 * from `response`. Flashcards: the student's own Anki-style `grade`, as in
 * the old Revisão card flip. The concept a review counts for comes from the
 * card in the database, never from this body.
 */
const bodySchema = z.object({
  cardId: z.string().min(1),
  response: z.string().max(500).optional(),
  grade: z.enum(["again", "hard", "good", "easy"]).optional(),
  durationMs: z.number().int().min(0),
});

export async function POST(request: Request) {
  const auth = await requireStudentApi();
  if ("error" in auth) return auth.error;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }

  try {
    const result = await recordReview(
      auth.supabase,
      auth.userId,
      body.data,
      "revisao"
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ReviewRejectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
