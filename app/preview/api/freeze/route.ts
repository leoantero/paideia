import { NextResponse } from "next/server";
import {
  PREVIEW_PROGRESS,
  assertPreviewEnabled,
} from "@/src/ui/student/preview/fixtures";

/** Dev-only stand-in for /api/store/streak-freeze. */
export async function POST() {
  assertPreviewEnabled();
  return NextResponse.json({
    coins: PREVIEW_PROGRESS.coins - PREVIEW_PROGRESS.streak_freeze_cost,
    streak_freezes: PREVIEW_PROGRESS.streak_freezes + 1,
  });
}
