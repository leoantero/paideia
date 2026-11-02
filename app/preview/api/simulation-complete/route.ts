import { NextResponse } from "next/server";
import { assertPreviewEnabled } from "@/src/ui/student/preview/fixtures";

/** Dev-only stand-in for /api/simulations/complete. */
export async function POST() {
  assertPreviewEnabled();
  return NextResponse.json({ awarded: true, points: 20, coins: 5 });
}
