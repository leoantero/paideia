// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createTestDb, createUser } from "./harness";
import {
  CONCEPT,
  PARENT,
  STUDENT_A,
  STUDENT_B,
  WED_10AM,
  enroll,
  insertConcept,
  rpcJson,
} from "./fixtures";

let db: PGlite;

const Q_MATH = "77777777-0000-0000-0000-000000000001";
const Q_PENDING = "77777777-0000-0000-0000-000000000002";
const Q_UNTAGGED = "77777777-0000-0000-0000-000000000003";
const Q_TOO_ADVANCED = "77777777-0000-0000-0000-000000000004";

interface Answer {
  attempt_id: string;
  correct: boolean;
  correct_letter: string | null;
  first_attempt: boolean;
  points: number;
  coins: number;
  concept_id: string;
}

interface SetItem {
  id: string;
  alternatives: Array<{ letter: string; text?: string }>;
  answered_before: boolean;
  correct_letter?: string;
}

async function insertQuestion(
  id: string,
  opts: {
    status?: string;
    concept?: string | null;
    grade?: number;
    number?: number;
  } = {}
) {
  await db.query(
    `insert into public_questions
       (id, origin, exam_year, exam_label, item_number, area, subject, concept_id, grade_year,
        stem, alternatives, correct_letter, source, review_status)
     values ($1, 'enem', 2019, 'ENEM 2019 · 2º dia', $2, 'matematica', 'math', $3, $4,
        '[{"type":"text","text":"Quanto é 3,2 × 10⁴?"}]',
        '[{"letter":"A","text":"320"},{"letter":"B","text":"3 200"},{"letter":"C","text":"32 000"},{"letter":"D","text":"320 000"}]',
        'C', '{"license":"teste"}', $5)`,
    [
      id,
      opts.number ?? Number(id.slice(-1)),
      opts.concept === undefined ? CONCEPT : opts.concept,
      opts.grade ?? 8,
      opts.status ?? "approved",
    ]
  );
}

const answer = (letter: string, user = STUDENT_A, question = Q_MATH) =>
  asUser(
    db,
    user,
    (tx) =>
      rpcJson<Answer>(tx, `select answer_question($1, $2, 5000) as r`, [
        question,
        letter,
      ]),
    { now: WED_10AM, commit: true }
  );

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, STUDENT_A, "student", "Ana Souza");
  await createUser(db, STUDENT_B, "student", "Bruno Lima");
  await createUser(db, PARENT, "parent", "Clara Souza");
  await enroll(db, [STUDENT_A, STUDENT_B]);
  await insertConcept(db);
  await db.exec(
    `update question_origin_settings set enabled = true where origin = 'enem'`
  );
  await insertQuestion(Q_MATH);
  await insertQuestion(Q_PENDING, { status: "pending_review" });
  await insertQuestion(Q_UNTAGGED, { concept: null });
  await insertQuestion(Q_TOO_ADVANCED, { grade: 11 });
});

describe("public_questions access", () => {
  it("students cannot read the question table (and so never see the answer key)", async () => {
    const rows = await asUser(db, STUDENT_A, async (tx) => {
      const res = await tx.query(`select * from public_questions`);
      return res.rows;
    });
    expect(rows).toEqual([]);
  });

  it("serves only approved, concept-anchored questions inside the student's grade window", async () => {
    const set = await asUser(db, STUDENT_A, (tx) =>
      rpcJson<SetItem[]>(tx, `select get_question_set('matematica') as r`)
    );
    expect(set.map((q) => q.id)).toEqual([Q_MATH]);
    expect(set[0]).not.toHaveProperty("correct_letter");
    expect(JSON.stringify(set)).not.toContain("correct");
  });

  it("serves nothing from an origin that has not been cleared", async () => {
    await db.exec(`update question_origin_settings set enabled = false`);
    const set = await asUser(db, STUDENT_A, (tx) =>
      rpcJson<SetItem[]>(tx, `select get_question_set('matematica') as r`)
    );
    expect(set).toEqual([]);
  });

  it("parents cannot list or answer questions", async () => {
    await expect(
      asUser(db, PARENT, (tx) =>
        rpcJson(tx, `select get_question_set('matematica') as r`)
      )
    ).rejects.toThrow(/Only students/);
    await expect(answer("C", PARENT)).rejects.toThrow(/Only students/);
  });
});

describe("answer_question", () => {
  it("grades on the server and rewards the first correct attempt", async () => {
    const r = await answer("C");
    expect(r).toMatchObject({
      correct: true,
      correct_letter: "C",
      first_attempt: true,
      points: 10,
      coins: 2,
      concept_id: CONCEPT,
    });
  });

  it("keeps the answer key hidden after a wrong answer until revealed", async () => {
    const r = await answer("B");
    expect(r.correct).toBe(false);
    expect(r.correct_letter).toBeNull();
    expect(r.points).toBe(2);

    const revealed = await asUser(
      db,
      STUDENT_A,
      (tx) =>
        rpcJson<{ correct_letter: string }>(
          tx,
          `select reveal_question_answer($1) as r`,
          [r.attempt_id]
        ),
      { commit: true }
    );
    expect(revealed.correct_letter).toBe("C");
  });

  it("does not let another student reveal someone else's attempt", async () => {
    const r = await answer("B");
    await expect(
      asUser(db, STUDENT_B, (tx) =>
        rpcJson(tx, `select reveal_question_answer($1) as r`, [r.attempt_id])
      )
    ).rejects.toThrow(/Attempt not found/);
  });

  it("only the first attempt counts for rewards", async () => {
    await answer("B");
    const second = await answer("C");
    expect(second).toMatchObject({
      correct: true,
      first_attempt: false,
      points: 0,
      coins: 0,
    });
  });

  it("rejects letters that are not alternatives and questions that are not served", async () => {
    await expect(answer("E")).rejects.toThrow(/Invalid alternative/);
    await expect(answer("A", STUDENT_A, Q_PENDING)).rejects.toThrow(
      /not available/
    );
  });

  it("attempts are visible only to their owner", async () => {
    await answer("B");
    const own = await asUser(
      db,
      STUDENT_A,
      async (tx) => (await tx.query(`select id from question_attempts`)).rows
    );
    const other = await asUser(
      db,
      STUDENT_B,
      async (tx) => (await tx.query(`select id from question_attempts`)).rows
    );
    const parent = await asUser(
      db,
      PARENT,
      async (tx) => (await tx.query(`select id from question_attempts`)).rows
    );
    expect(own).toHaveLength(1);
    expect(other).toHaveLength(0);
    expect(parent).toHaveLength(0);
  });

  it("the tutor context (with the answer key) is not callable by students", async () => {
    const r = await answer("B");
    await expect(
      asUser(db, STUDENT_A, (tx) =>
        rpcJson(tx, `select question_tutor_context($1, $2) as r`, [
          r.attempt_id,
          STUDENT_A,
        ])
      )
    ).rejects.toThrow(/permission denied/);
  });
});

describe("get_question_overview", () => {
  it("counts served questions per concept and first-attempt accuracy", async () => {
    await answer("C");
    const overview = await asUser(db, STUDENT_A, (tx) =>
      rpcJson<{
        total: number;
        answered: number;
        areas: Array<{ area: string; total: number }>;
        concepts: Array<{
          concept_id: string;
          total: number;
          answered: number;
          accuracy: number;
        }>;
      }>(tx, `select get_question_overview('matematica') as r`)
    );
    expect(overview.total).toBe(1);
    expect(overview.answered).toBe(1);
    expect(overview.concepts).toEqual([
      expect.objectContaining({
        concept_id: CONCEPT,
        total: 1,
        answered: 1,
        accuracy: 100,
      }),
    ]);
    expect(overview.areas).toContainEqual({ area: "natureza", total: 0 });
  });
});

describe("complete_simulation", () => {
  it("rewards once per simulation", async () => {
    const run = () =>
      asUser(
        db,
        STUDENT_A,
        (tx) =>
          rpcJson<{ awarded: boolean; points?: number }>(
            tx,
            `select complete_simulation('fracoes-pizza') as r`
          ),
        { commit: true }
      );
    expect(await run()).toMatchObject({ awarded: true, points: 20 });
    expect(await run()).toEqual({ awarded: false });
  });
});
