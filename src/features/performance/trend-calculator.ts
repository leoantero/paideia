/**
 * Pure logic only — deliberately has no "server-only" guard and no I/O, so
 * it can be unit tested (performance-service.test.ts) without a database or
 * Next.js server context.
 *
 * Mirrors the SQL upsert logic in record_tutoring_session()
 * (supabase/migrations/0006_functions_and_rls.sql). Keep both in sync if
 * either changes.
 */

export type Trend = "improving" | "stable" | "declining";

export function computeNextTrend(previousSessionCount: number): {
  sessionCount: number;
  trend: Trend;
} {
  const sessionCount = previousSessionCount + 1;
  const trend: Trend = sessionCount >= 3 ? "improving" : "stable";
  return { sessionCount, trend };
}
