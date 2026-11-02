import { NextResponse } from "next/server";
import { assertPreviewEnabled } from "@/src/ui/student/preview/fixtures";
import { findPreviewQuestion } from "@/src/ui/student/preview/question-fixtures";

/** Dev-only stand-in for /api/questions/reveal. */
export async function POST(request: Request) {
  assertPreviewEnabled();
  const { attemptId } = await request.json();
  const question = findPreviewQuestion(String(attemptId).split(":")[0]);
  if (!question) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  return NextResponse.json({
    attempt_id: attemptId,
    correct_letter: question.correct_letter,
  });
}
