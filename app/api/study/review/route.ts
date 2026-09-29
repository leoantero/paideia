import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentApi } from "@/src/core/auth/require-student-api";
import { ReviewRejectedError, recordReview } from "@/src/features/spaced-repetition/study-service";

const bodySchema = z.object({
  cardId: z.string().min(1),
  response: z.string().max(500),
  durationMs: z.number().int().min(0),
});

/** Multiple-choice and short-answer cards: graded by record_review() in Postgres. */
export async function POST(request: Request) {
  const auth = await requireStudentApi();
  if ("error" in auth) return auth.error;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }

  try {
    const result = await recordReview(auth.supabase, body.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ReviewRejectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
