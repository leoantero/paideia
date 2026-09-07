import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GradeBand } from "@/src/core/auth/types";

export interface LinkedChild {
  id: string;
  full_name: string;
  grade_level: GradeBand | null;
  school_name: string | null;
}

/**
 * Filhos vinculados ao responsável autenticado, com nome. RLS
 * (`students_select_linked_parent`, `profiles_select_linked_parent` em
 * supabase/migrations/0011_parent_read_student_profile.sql) é o que de fato
 * restringe isso à própria família — nada aqui filtra por parent_id.
 */
export async function getLinkedChildren(
  supabase: SupabaseClient
): Promise<LinkedChild[]> {
  const { data: students, error } = await supabase
    .from("students")
    .select("id, grade_level, school_name");
  if (error || !students || students.length === 0) return [];

  const ids = students.map((s) => s.id as string);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return students.map((s) => ({
    id: s.id as string,
    full_name: nameById.get(s.id as string) ?? "Seu filho",
    grade_level: s.grade_level as GradeBand | null,
    school_name: s.school_name as string | null,
  }));
}

export interface SubjectMastery {
  subject: string;
  masteryPct: number;
  fewData: boolean;
  sessionCount: number;
  /** Sem histórico de snapshot ainda (ver docs/REDESIGN_PLAN.md §4) — sempre
   *  "stable" até existir uma série temporal de mastery pra derivar tendência. */
  trend: "up" | "down" | "stable";
}

const FEW_DATA_THRESHOLD = 0.3;

/**
 * Agrega `concept_mastery` por matéria para um conjunto de filhos. O aluno
 * nunca é misturado com outro aqui — a chave do mapa de retorno é o
 * student_id, e RLS já restringe as linhas lidas às da própria família.
 */
export async function getMasteryBySubject(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<Map<string, SubjectMastery[]>> {
  const result = new Map<string, SubjectMastery[]>();
  if (studentIds.length === 0) return result;

  const { data, error } = await supabase
    .from("concept_mastery")
    .select(
      "student_id, mastery, confidence, evidence_count, concepts(subject)"
    )
    .in("student_id", studentIds);

  if (error || !data) return result;

  type Row = {
    student_id: string;
    mastery: number;
    confidence: number;
    evidence_count: number;
    concepts: { subject: string } | { subject: string }[] | null;
  };

  const bySubject = new Map<
    string,
    Map<
      string,
      {
        weightedMastery: number;
        confidenceSum: number;
        evidenceCount: number;
        conceptCount: number;
      }
    >
  >();

  for (const row of data as Row[]) {
    const conceptRel = Array.isArray(row.concepts)
      ? row.concepts[0]
      : row.concepts;
    const subject = conceptRel?.subject;
    if (!subject) continue;

    if (!bySubject.has(row.student_id))
      bySubject.set(row.student_id, new Map());
    const subjects = bySubject.get(row.student_id)!;
    const acc = subjects.get(subject) ?? {
      weightedMastery: 0,
      confidenceSum: 0,
      evidenceCount: 0,
      conceptCount: 0,
    };
    acc.weightedMastery += row.mastery * row.confidence;
    acc.confidenceSum += row.confidence;
    acc.evidenceCount += row.evidence_count;
    acc.conceptCount += 1;
    subjects.set(subject, acc);
  }

  for (const studentId of studentIds) {
    const subjects = bySubject.get(studentId);
    if (!subjects) {
      result.set(studentId, []);
      continue;
    }
    result.set(
      studentId,
      [...subjects.entries()].map(([subject, acc]) => {
        const avgConfidence =
          acc.conceptCount > 0 ? acc.confidenceSum / acc.conceptCount : 0;
        const mastery =
          acc.confidenceSum > 0
            ? acc.weightedMastery / acc.confidenceSum
            : 0.15;
        return {
          subject,
          masteryPct: Math.round(mastery * 100),
          fewData: avgConfidence < FEW_DATA_THRESHOLD,
          sessionCount: acc.evidenceCount,
          trend: "stable",
        };
      })
    );
  }

  return result;
}
