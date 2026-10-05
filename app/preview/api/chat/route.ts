import { NextResponse } from "next/server";
import { assertPreviewEnabled } from "@/src/ui/student/preview/fixtures";

/** Dev-only stand-in for /api/tutor/chat (no model call). */
export async function POST() {
  assertPreviewEnabled();
  return NextResponse.json({
    conversationId: "preview",
    reply:
      "Interessante! E o que você já sabe sobre isso que poderia ajudar no próximo passo?",
    reward: { awarded: true, points: 15, coins: 3 },
  });
}
