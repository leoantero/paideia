import type { PGlite } from "@electric-sql/pglite";
import type { Tx } from "./harness";

export const STUDENT_A = "11111111-1111-1111-1111-111111111111";
export const STUDENT_B = "22222222-2222-2222-2222-222222222222";
export const STUDENT_C = "33333333-3333-3333-3333-333333333333";
export const PARENT = "44444444-4444-4444-4444-444444444444";
export const CONCEPT = "55555555-5555-5555-5555-555555555555";
export const CLASS_8A = "bbbbbbbb-0000-0000-0000-000000000001";

/** Wednesday of a week whose Monday is 2026-09-28 (school local time). */
export const WED_10AM = "2026-09-30T10:00:00-03:00";
export const THU_10AM = "2026-10-01T10:00:00-03:00";
export const FRI_10AM = "2026-10-02T10:00:00-03:00";
export const SAT_10AM = "2026-10-03T10:00:00-03:00";
export const MON_10AM = "2026-10-05T10:00:00-03:00";

export async function insertDeck(
  db: PGlite,
  opts: {
    id?: string;
    subject?: string;
    grade?: string;
    status?: "pending_review" | "approved";
    extraCards?: number;
  } = {}
): Promise<string> {
  const id = opts.id ?? "deck-sci";
  await db.query(
    `insert into decks (id, title, subject, grade_level, review_status)
     values ($1, 'Fotossíntese', $2, $3, $4)`,
    [
      id,
      opts.subject ?? "science",
      opts.grade ?? "elementary_1",
      opts.status ?? "approved",
    ]
  );
  await db.query(
    `insert into cards (id, deck_id, position, kind, prompt, answer, choices, correct_choice) values
       ($1 || '-mc', $1, 1, 'multiple_choice', 'Qual gás a planta absorve?', 'Gás carbônico', array['Oxigênio','Gás carbônico','Hélio'], 1)`,
    [id]
  );
  await db.query(
    `insert into cards (id, deck_id, position, kind, prompt, answer, accepted_answers) values
       ($1 || '-short', $1, 2, 'short_answer', 'Nome do processo?', 'Fotossíntese', array['fotossíntese'])`,
    [id]
  );
  await db.query(
    `insert into cards (id, deck_id, position, kind, prompt, answer) values
       ($1 || '-open', $1, 3, 'open', 'Por que as folhas são verdes?', 'Clorofila reflete o verde.')`,
    [id]
  );
  await insertConcept(db);
  await db.query(
    `insert into cards (id, deck_id, concept_id, position, kind, prompt, answer) values
       ($1 || '-flash', $1, $2, 4, 'flashcard', 'O que é clorofila?', 'O pigmento verde das plantas.')`,
    [id, CONCEPT]
  );
  for (let i = 0; i < (opts.extraCards ?? 0); i++) {
    await db.query(
      `insert into cards (id, deck_id, position, kind, prompt, answer, accepted_answers)
       values ($1 || '-x' || $2, $1, $3, 'short_answer', 'Extra?', 'sim', array['sim'])`,
      [id, i, 10 + i]
    );
  }
  return id;
}

/** One concept in the learning graph, idempotent so several decks can share it. */
export async function insertConcept(db: PGlite): Promise<string> {
  await db.query(
    `insert into curriculum_versions (id, code, label)
     values ('66666666-6666-6666-6666-666666666666', 'test', 'Teste') on conflict do nothing`
  );
  await db.query(
    `insert into concepts (id, curriculum_version_id, code, name, subject, grade_band)
     values ($1, '66666666-6666-6666-6666-666666666666', 'EF08CI-FOTO', 'Fotossíntese', 'science', 'elementary_1')
     on conflict do nothing`,
    [CONCEPT]
  );
  return CONCEPT;
}

/** School → class → active enrollment for each student (the MVP tenancy, 0009). */
export async function enroll(
  db: PGlite,
  students: string[],
  classId = CLASS_8A
): Promise<void> {
  await db.exec(`
    insert into organizations (id, name, slug) values ('aaaaaaaa-0000-0000-0000-000000000000', 'Rede Demo', 'rede-demo') on conflict do nothing;
    insert into schools (id, organization_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Escola Demo') on conflict do nothing;
  `);
  await db.query(
    `insert into school_classes (id, school_id, name, grade_year, academic_year)
     values ($1, 'aaaaaaaa-0000-0000-0000-000000000001', '8º ano A', 8, 2026) on conflict do nothing`,
    [classId]
  );
  for (const s of students) {
    await db.query(
      `insert into enrollments (student_id, class_id) values ($1, $2)`,
      [s, classId]
    );
  }
}

export interface ReviewResult {
  concept_id: string | null;
  first_today: boolean;
  card_id: string;
  grade: "again" | "hard" | "good" | "easy";
  correct: boolean;
  answer: string;
  interval_days: number;
  next_due_on: string;
  points: number;
  coins: number;
  daily_goal_completed: boolean;
}

export async function review(
  tx: Tx,
  cardId: string,
  response: string | null,
  openGrade: string | null = null,
  durationMs = 10000
): Promise<ReviewResult> {
  const res = await tx.query<{ r: ReviewResult }>(
    `select record_review($1, $2, $3::review_grade, $4) as r`,
    [cardId, response, openGrade, durationMs]
  );
  return res.rows[0].r;
}

export async function rpcJson<T>(
  tx: Tx,
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const res = await tx.query<{ r: T }>(sql, params);
  return res.rows[0].r;
}
