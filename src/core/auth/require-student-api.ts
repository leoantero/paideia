import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getVerifiedUser } from "@/src/lib/supabase/verified-user";

/**
 * Route-handler counterpart of requireRole("student"): returns the session
 * client for a signed-in student, or the error response to send back.
 */
export async function requireStudentApi(): Promise<
  { supabase: SupabaseClient; userId: string } | { error: NextResponse }
> {
  const { supabase, user } = await getVerifiedUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") {
    return {
      error: NextResponse.json({ error: "Students only." }, { status: 403 }),
    };
  }

  return { supabase, userId: user.id };
}
