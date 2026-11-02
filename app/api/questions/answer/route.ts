import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentApi } from "@/src/core/auth/require-student-api";
import {
  QuestionRejectedError,
  answerQuestion,
} from "@/src/features/questions/question-service";

/**
 * Corrigida por answer_question() no Postgres. O conceito para a evidência
 * vem da questão no banco, nunca deste corpo.
 */
const bodySchema = z.object({
  questionId: z.string().uuid(),
  letter: z.enum(["A", "B", "C", "D", "E"]),
  durationMs: z.number().int().min(0),
});

export async function POST(request: Request) {
  const auth = await requireStudentApi();
  if ("error" in auth) return auth.error;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid answer." }, { status: 400 });
  }

  try {
    const result = await answerQuestion(auth.supabase, auth.userId, body.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof QuestionRejectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
