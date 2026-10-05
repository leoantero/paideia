import { NextResponse } from "next/server";
import {
  assertPreviewEnabled,
  findPreviewCard,
} from "@/src/ui/student/preview/fixtures";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, " ")
    .trim();

/** Dev-only stand-in for /api/study/review (the real grading lives in record_review()). */
export async function POST(request: Request) {
  assertPreviewEnabled();
  const { cardId, response, grade } = await request.json();
  const card = findPreviewCard(cardId);
  if (!card)
    return NextResponse.json({ error: "Card not available." }, { status: 404 });

  const correct =
    card.kind === "flashcard"
      ? grade !== "again"
      : card.kind === "multiple_choice"
        ? Number(response) === card.correctChoice
        : (card.acceptedAnswers ?? []).some(
            (a) => normalize(a) === normalize(response)
          );

  return NextResponse.json({
    card_id: cardId,
    concept_id: null,
    concept_difficulty: null,
    first_today: true,
    grade: card.kind === "flashcard" ? grade : correct ? "good" : "again",
    correct,
    answer: card.answer,
    correct_choice: card.correctChoice ?? null,
    interval_days: correct ? 3 : 0,
    next_due_on: "",
    points: correct ? 8 : 2,
    coins: correct ? 1 : 0,
    daily_goal_completed: false,
  });
}
