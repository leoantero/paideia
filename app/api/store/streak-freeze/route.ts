import { NextResponse } from "next/server";
import { requireStudentApi } from "@/src/core/auth/require-student-api";
import {
  PurchaseRejectedError,
  buyStreakFreeze,
} from "@/src/features/gamification/gamification-service";

export async function POST() {
  const auth = await requireStudentApi();
  if ("error" in auth) return auth.error;

  try {
    return NextResponse.json(await buyStreakFreeze(auth.supabase));
  } catch (err) {
    if (err instanceof PurchaseRejectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
