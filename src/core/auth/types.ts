/**
 * Shared domain types for roles and grade bands.
 *
 * These mirror the Postgres enums defined in supabase/migrations/0001_profiles.sql
 * and supabase/migrations/0002_students.sql — keep them in sync if the schema changes.
 *
 * `Role` intentionally only has two values in Phase 1. Teacher/Director are deferred
 * (see docs/ARCHITECTURE.md "Evolution Path") but the enum on the DB side is designed
 * so adding them later doesn't require migrating existing rows.
 */

/**
 * `director` é o "gestor" no vocabulário do produto: administra o contrato da
 * escola e enxerga a visão agregada da unidade. O enum do banco (migration
 * 0009) já traz o valor. `coordinator` segue reservado para uma futura
 * distinção unidade × rede.
 */
export type Role = "student" | "parent" | "teacher" | "director";

/** Onde cada perfil cai ao entrar. */
export const ROLE_HOME: Record<Role, string> = {
  student: "/student/tutor",
  parent: "/parent/dashboard",
  teacher: "/teacher/turma",
  director: "/gestor/insights",
};

/** Rótulo em pt-BR de cada perfil. */
export const ROLE_LABEL: Record<Role, string> = {
  student: "Aluno",
  parent: "Responsável",
  teacher: "Professor",
  director: "Gestor",
};

/** Domínio interno dos e-mails sintéticos de aluno (login é por matrícula). */
export const STUDENT_EMAIL_DOMAIN = "aluno.paideia.app";

export const matriculaToEmail = (matricula: string) =>
  `${matricula.trim().toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;

export type GradeBand = "elementary_1" | "elementary_2" | "high_school";

export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  elementary_1: "Elementary School I",
  elementary_2: "Elementary School II",
  high_school: "High School",
};

/** Rótulos em pt-BR — usados no prompt do tutor e na UI (ver docs/MVP_SPEC.md §1). */
export const GRADE_BAND_LABELS_PT: Record<GradeBand, string> = {
  elementary_1: "Ensino Fundamental I",
  elementary_2: "Ensino Fundamental II",
  high_school: "Ensino Médio",
};

/** Daily spaced-repetition goal in minutes, per docs/PEDAGOGY.md. */
export const DAILY_GOAL_MINUTES: Record<GradeBand, number> = {
  elementary_1: 5,
  elementary_2: 10,
  high_school: 20,
};

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  grade_level: GradeBand | null;
  school_name: string | null;
  linking_code: string;
  created_at: string;
}

export type StrengthLevel = "strong" | "average" | "weak";
export type Trend = "improving" | "stable" | "declining";
