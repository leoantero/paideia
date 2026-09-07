import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Agregados da unidade/rede para o gestor.
 *
 * Tudo aqui sai das funções security-definer de
 * supabase/migrations/0015_gestor_scope.sql, que recalculam o escopo a partir
 * de auth.uid() e devolvem SÓ CONTAGEM. O gestor nunca lê `learning_events`
 * linha a linha — a evidência bruta é quase tão reveladora quanto a
 * transcrição, e é justamente o que faz o DPA da rede ser assinável.
 */

export interface SchoolOverview {
  activeStudents: number;
  linkedGuardians: number;
  teachers: number;
  sessions7d: number;
  studentsActive7d: number;
}

export interface DailySessions {
  day: string;
  sessions: number;
}

export interface TeacherEngagement {
  teacherId: string;
  teacherName: string;
  classes: number;
  students: number;
  sessions7d: number;
  sessionsPerStudent: number;
}

export interface SubjectMastery {
  subject: string;
  avgMasteryPct: number;
  students: number;
  conceptsTracked: number;
}

export interface GuardianCoverage {
  total: number;
  withGuardian: number;
  withoutGuardian: number;
}

export interface GestorScope {
  schoolName: string | null;
  organizationName: string | null;
}

export async function getGestorScope(
  supabase: SupabaseClient
): Promise<GestorScope> {
  const [{ data: schools }, { data: orgs }] = await Promise.all([
    supabase.from("schools").select("name").limit(1),
    supabase.from("organizations").select("name").limit(1),
  ]);
  return {
    schoolName: schools?.[0]?.name ?? null,
    organizationName: orgs?.[0]?.name ?? null,
  };
}

export async function getSchoolOverview(
  supabase: SupabaseClient
): Promise<SchoolOverview> {
  const { data } = await supabase.rpc("school_overview");
  const row = Array.isArray(data) ? data[0] : data;
  return {
    activeStudents: row?.active_students ?? 0,
    linkedGuardians: row?.linked_guardians ?? 0,
    teachers: row?.teachers ?? 0,
    sessions7d: row?.sessions_7d ?? 0,
    studentsActive7d: row?.students_active_7d ?? 0,
  };
}

export async function getDailySessions(
  supabase: SupabaseClient,
  days = 14
): Promise<DailySessions[]> {
  const { data } = await supabase.rpc("school_daily_sessions", {
    p_days: days,
  });
  return ((data ?? []) as { day: string; sessions: number }[]).map((r) => ({
    day: r.day,
    sessions: r.sessions,
  }));
}

export async function getTeacherEngagement(
  supabase: SupabaseClient
): Promise<TeacherEngagement[]> {
  const { data } = await supabase.rpc("teacher_engagement");
  return ((data ?? []) as Record<string, unknown>[])
    .map((r) => ({
      teacherId: r.teacher_id as string,
      teacherName: (r.teacher_name as string) ?? "Professor",
      classes: Number(r.classes ?? 0),
      students: Number(r.students ?? 0),
      sessions7d: Number(r.sessions_7d ?? 0),
      sessionsPerStudent: Number(r.sessions_per_student ?? 0),
    }))
    .sort((a, b) => b.sessionsPerStudent - a.sessionsPerStudent);
}

export async function getSubjectMastery(
  supabase: SupabaseClient
): Promise<SubjectMastery[]> {
  const { data } = await supabase.rpc("subject_mastery_overview");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    subject: r.subject as string,
    avgMasteryPct: Math.round(Number(r.avg_mastery ?? 0) * 100),
    students: Number(r.students ?? 0),
    conceptsTracked: Number(r.concepts_tracked ?? 0),
  }));
}

export async function getGuardianCoverage(
  supabase: SupabaseClient
): Promise<GuardianCoverage> {
  const { data } = await supabase.rpc("guardian_coverage");
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total: row?.students_total ?? 0,
    withGuardian: row?.students_with_guardian ?? 0,
    withoutGuardian: row?.students_without_guardian ?? 0,
  };
}
