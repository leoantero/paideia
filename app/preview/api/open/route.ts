import { NextResponse } from "next/server";
import { assertPreviewEnabled, findPreviewCard } from "@/src/ui/student/preview/fixtures";

/**
 * Dev-only stand-in for /api/study/open. No model call: answers with 8+
 * words count as correct, otherwise one canned guiding question.
 */
export async function POST(request: Request) {
  assertPreviewEnabled();
  const { cardId, history, answer } = await request.json();
  const card = findPreviewCard(cardId);
  if (!card) return NextResponse.json({ error: "Card not available." }, { status: 404 });

  const attempt = history.filter((m: { role: string }) => m.role === "student").length + 1;
  const good = answer.trim().split(/\s+/).length >= 8;

  if (!good && attempt < 3) {
    return NextResponse.json({
      final: false,
      verdict: "partially_correct",
      reply: "Você começou bem! O que acontece se você pensar no motivo por trás disso? Consegue dar um exemplo?",
      attempt,
    });
  }

  return NextResponse.json({
    final: true,
    verdict: good ? "correct" : "incorrect",
    reply: good ? "Isso! Você explicou a ideia principal com as suas palavras." : "Vamos olhar a explicação juntos.",
    attempt,
    result: {
      card_id: cardId,
      grade: good ? (attempt === 1 ? "good" : "hard") : "again",
      correct: good,
      answer: card.answer,
      correct_choice: null,
      interval_days: good ? 1 : 0,
      next_due_on: "",
      points: good ? 8 : 2,
      coins: good ? 1 : 0,
      daily_goal_completed: good && attempt === 1,
    },
  });
}
