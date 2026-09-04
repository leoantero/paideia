import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Thin wrapper around the `record_tutoring_session` Postgres RPC
 * (supabase/migrations/0006_functions_and_rls.sql).
 *
 * IMPORTANT: this is a heuristic MVP stub, not real mastery scoring. It
 * exists so the parent dashboard has genuine, RLS-protected, end-to-end
 * data to show for the demo. Replacing it with real accuracy/mastery
 * calculation is explicit future work (see docs/ARCHITECTURE.md, Evolution Path).
 *
 * The pure trend-calculation logic this mirrors lives in
 * trend-calculator.ts (no "server-only", unit-testable without a database).
 */
export async function recordTutoringSession(
  supabase: SupabaseClient,
  subject: string
): Promise<void> {
  const { error } = await supabase.rpc("record_tutoring_session", {
    p_subject: subject,
  });

  if (error) {
    // Non-fatal: the tutoring chat should not fail just because the
    // performance stub couldn't update. Log and move on.
    console.warn(`[performance-service] record_tutoring_session failed: ${error.message}`);
  }
}
