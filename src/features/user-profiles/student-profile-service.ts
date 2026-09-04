import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GradeBand, StudentProfile } from "@/src/core/auth/types";

export async function getStudentProfile(
  supabase: SupabaseClient,
  studentId: string
): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  if (error || !data) return null;
  return data as StudentProfile;
}

/** Used during onboarding — RLS (`students_update_self`) allows only the student themself to call this. */
export async function setGradeLevel(
  supabase: SupabaseClient,
  studentId: string,
  gradeLevel: GradeBand,
  schoolName?: string
): Promise<void> {
  const { error } = await supabase
    .from("students")
    .update({ grade_level: gradeLevel, school_name: schoolName ?? null })
    .eq("id", studentId);

  if (error) {
    throw new Error(`Failed to set grade level: ${error.message}`);
  }
}
