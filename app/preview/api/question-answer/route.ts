import { NextResponse } from "next/server";
import { assertPreviewEnabled } from "@/src/ui/student/preview/fixtures";
import { findPreviewQuestion } from "@/src/ui/student/preview/question-fixtures";

/** Dev-only stand-in for /api/questions/answer, graded against the fixtures. */
export async function POST(request: Request) {
  assertPreviewEnabled();
  const { questionId, letter } = await request.json();
  const question = findPreviewQuestion(questionId);
  if (!question) {
    return NextResponse.json(
      { error: "Question not available." },
      { status: 409 }
    );
  }
  const correct = letter === question.correct_letter;
  return NextResponse.json({
    attempt_id: `${questionId}:${letter}`,
    question_id: questionId,
    origin: question.origin,
    correct,
    correct_letter: correct ? question.correct_letter : null,
    first_attempt: true,
    points: correct ? 10 : 2,
    coins: correct ? 2 : 0,
    concept_id: question.concept_id,
    difficulty: 0.5,
  });
}
