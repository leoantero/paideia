import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Calls the `link_student_by_code` security-definer RPC
 * (supabase/migrations/0006_functions_and_rls.sql). This is the ONLY way a
 * parent-student link can be created — there is deliberately no INSERT
 * policy on `parent_student_links` for authenticated users, so a parent can
 * never fabricate a link by guessing a student's UUID; they must have the
 * student's actual linking_code.
 *
 * No "server-only" guard here (unlike the other feature services): this
 * function is called directly from the client-side link-student page and
 * only ever uses the caller's own session (anon key) — there's no secret
 * involved, the RPC itself is what enforces safety server-side in Postgres.
 */
export async function linkStudentByCode(
  supabase: SupabaseClient,
  code: string
): Promise<{ studentId: string }> {
  const { data, error } = await supabase.rpc("link_student_by_code", {
    p_code: code.trim().toUpperCase(),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Invalid linking code.");
  }

  return { studentId: data.student_id };
}
