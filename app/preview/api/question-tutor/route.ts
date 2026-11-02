import { NextResponse } from "next/server";
import { assertPreviewEnabled } from "@/src/ui/student/preview/fixtures";
import { findPreviewQuestion } from "@/src/ui/student/preview/question-fixtures";

/** Dev-only stand-in for /api/questions/tutor (no model call). */
export async function POST(request: Request) {
  assertPreviewEnabled();
  const { attemptId, message, event } = await request.json();
  const [questionId, chosen] = String(attemptId).split(":");
  const question = findPreviewQuestion(questionId);
  const correct = question?.correct_letter === chosen;

  let reply: string;
  if (event === "revealed") {
    reply = `Agora você sabe que é a ${question?.correct_letter}. Compare com a ${chosen}, que você marcou: qual é a diferença entre as duas que faz uma estar certa?`;
  } else if (message) {
    reply =
      "Boa, isso ajuda! E se você fizer só o primeiro passo da conta, o que aparece?";
  } else if (correct) {
    reply = `Isso, ${chosen}! Agora me conta: como você explicaria para um colega por que essa é a certa?`;
  } else {
    reply = `Você marcou ${chosen}. O que te fez pensar que era essa? Me conta o caminho que você seguiu.`;
  }

  return NextResponse.json({
    conversationId: "preview",
    reply,
    reward: { awarded: Boolean(message), points: 15, coins: 3 },
  });
}
