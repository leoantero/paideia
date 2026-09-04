import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PerformanceRecord, StudentProfile } from "@/src/core/auth/types";

/**
 * Fetches the parent's linked children. Relies entirely on RLS
 * (`students_select_linked_parent` in supabase/migrations/0002_students.sql)
 * to scope results — no manual filtering by parent_id is needed here, and
 * none should be added: RLS is what actually prevents cross-family reads,
 * not this query.
 */
export async function getLinkedStudents(
  supabase: SupabaseClient
): Promise<StudentProfile[]> {
  const { data, error } = await supabase.from("students").select("*");
  if (error || !data) return [];
  return data as StudentProfile[];
}

/**
 * Fetches performance summaries for the given students. RLS
 * (`performance_select_self_or_parent`) again does the actual access
 * control — this only returns trend/strength data, never raw conversation
 * content, because `performance_records` never stores that.
 */
export async function getPerformanceForStudents(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<PerformanceRecord[]> {
  if (studentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("performance_records")
    .select("*")
    .in("student_id", studentIds);

  if (error || !data) return [];
  return data as PerformanceRecord[];
}
