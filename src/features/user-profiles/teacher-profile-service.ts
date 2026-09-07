import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface TeacherClass {
  id: string;
  name: string;
  academic_year: number;
}

/** RLS (`school_classes_select_scoped`) já restringe às turmas do professor. */
export async function getTeacherClasses(
  supabase: SupabaseClient
): Promise<TeacherClass[]> {
  const { data, error } = await supabase
    .from("school_classes")
    .select("id, name, academic_year")
    .order("name");
  if (error || !data) return [];
  return data as TeacherClass[];
}

export interface HeatmapConcept {
  id: string;
  code: string;
  name: string;
}

export interface HeatmapCell {
  mastery: number;
  confidence: number;
}

export interface HeatmapStudent {
  id: string;
  label: string;
  avgMastery: number | null;
}

export interface ClassHeatmap {
  students: HeatmapStudent[];
  concepts: HeatmapConcept[];
  cells: Map<string, Map<string, HeatmapCell>>;
  /** Conceitos com domínio médio da turma < 50% — "a turma não fixou". */
  weakConcepts: { concept: HeatmapConcept; avgMastery: number }[];
}

const EMPTY_HEATMAP: ClassHeatmap = {
  students: [],
  concepts: [],
  cells: new Map(),
  weakConcepts: [],
};

/** "Ana Beatriz Souza" -> "Ana S." — nunca o nome completo (decisão #7). */
function firstNameAndInitial(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? "Aluno";
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

/**
 * Heatmap turma x conceito. Só usa dados que o professor já enxerga por RLS:
 * `concept_mastery_select_staff` (0009) e `students_select_staff` /
 * `profiles_select_staff` (0012) — nunca learning_events, nunca messages.
 */
export async function getClassHeatmap(
  supabase: SupabaseClient,
  classId: string
): Promise<ClassHeatmap> {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", classId)
    .eq("status", "active");

  const studentIds = (enrollments ?? []).map((e) => e.student_id as string);
  if (studentIds.length === 0) return EMPTY_HEATMAP;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", studentIds);
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name as string])
  );

  const { data: masteryRows } = await supabase
    .from("concept_mastery")
    .select(
      "student_id, concept_id, mastery, confidence, concepts(id, code, name)"
    )
    .in("student_id", studentIds)
    .gt("evidence_count", 0);

  type Row = {
    student_id: string;
    concept_id: string;
    mastery: number;
    confidence: number;
    concepts:
      | { id: string; code: string; name: string }
      | { id: string; code: string; name: string }[]
      | null;
  };

  const conceptById = new Map<string, HeatmapConcept>();
  const cells = new Map<string, Map<string, HeatmapCell>>();
  const conceptSums = new Map<string, { sum: number; n: number }>();

  for (const row of (masteryRows ?? []) as Row[]) {
    const conceptRel = Array.isArray(row.concepts)
      ? row.concepts[0]
      : row.concepts;
    if (!conceptRel) continue;

    conceptById.set(row.concept_id, {
      id: row.concept_id,
      code: conceptRel.code,
      name: conceptRel.name,
    });

    if (!cells.has(row.student_id)) cells.set(row.student_id, new Map());
    cells.get(row.student_id)!.set(row.concept_id, {
      mastery: row.mastery,
      confidence: row.confidence,
    });

    const acc = conceptSums.get(row.concept_id) ?? { sum: 0, n: 0 };
    acc.sum += row.mastery;
    acc.n += 1;
    conceptSums.set(row.concept_id, acc);
  }

  const concepts = [...conceptById.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const students: HeatmapStudent[] = studentIds
    .map((id) => {
      const studentCells = cells.get(id);
      const values = studentCells
        ? [...studentCells.values()].map((c) => c.mastery)
        : [];
      const avgMastery = values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
      return {
        id,
        label: firstNameAndInitial(nameById.get(id) ?? "Aluno"),
        avgMastery,
      };
    })
    .sort((a, b) => (b.avgMastery ?? -1) - (a.avgMastery ?? -1));

  const weakConcepts = concepts
    .map((c) => {
      const acc = conceptSums.get(c.id)!;
      return { concept: c, avgMastery: acc.sum / acc.n };
    })
    .filter((w) => w.avgMastery < 0.5)
    .sort((a, b) => a.avgMastery - b.avgMastery);

  return { students, concepts, cells, weakConcepts };
}
