import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentApi } from "@/src/core/auth/require-student-api";
import {
  QuestionRejectedError,
  revealAnswer,
} from "@/src/features/questions/question-service";

const bodySchema = z.object({ attemptId: z.string().uuid() });

export async function POST(request: Request) {
  const auth = await requireStudentApi();
  if ("error" in auth) return auth.error;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await revealAnswer(auth.supabase, body.data.attemptId)
    );
  } catch (err) {
    if (err instanceof QuestionRejectedError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
