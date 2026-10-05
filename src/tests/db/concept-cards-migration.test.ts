// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyMigrations, asUser, createTestDb, createUser } from "./harness";
import { STUDENT_A, WED_10AM, review } from "./fixtures";

const CARD = "77777777-7777-7777-7777-777777777777";

describe("0021 migrates the 0014 concept cards", () => {
  it("keeps every card, its id and its concept, as approved self-graded flashcards", async () => {
    const db = await createTestDb({ stopBefore: "0021" });
    await db.exec(`
      insert into curriculum_versions (id, code, label) values ('66666666-6666-6666-6666-666666666666', 'bncc', 'BNCC');
      insert into concepts (id, curriculum_version_id, code, name, subject, grade_band) values
        ('55555555-5555-5555-5555-555555555551', '66666666-6666-6666-6666-666666666666', 'EF08MA01', 'Notação científica', 'math', 'elementary_2'),
        ('55555555-5555-5555-5555-555555555552', '66666666-6666-6666-6666-666666666666', 'EF08HI-REVF', 'Revolução Francesa', 'history', 'elementary_2');
      insert into concept_cards (id, concept_id, front, back, position) values
        ('${CARD}', '55555555-5555-5555-5555-555555555551', 'O que é notação científica?', 'a × 10ⁿ', 0),
        (gen_random_uuid(), '55555555-5555-5555-5555-555555555551', 'Escreva 3000 assim', '3 × 10³', 1),
        (gen_random_uuid(), '55555555-5555-5555-5555-555555555552', 'Quando começou?', '1789', 0);
    `);

    await applyMigrations(db, { from: "0021" });

    const decks = await db.query<{
      id: string;
      title: string;
      review_status: string;
    }>(`select id, title, review_status from decks order by id`);
    expect(decks.rows).toEqual([
      {
        id: "conceitos-history-elementary_2",
        title: "Conceitos de História",
        review_status: "approved",
      },
      {
        id: "conceitos-math-elementary_2",
        title: "Conceitos de Matemática",
        review_status: "approved",
      },
    ]);

    const card = await db.query<{
      deck_id: string;
      kind: string;
      prompt: string;
      concept_id: string;
      position: number;
    }>(
      `select deck_id, kind, prompt, concept_id, position from cards where id = $1`,
      [CARD]
    );
    expect(card.rows[0]).toEqual({
      deck_id: "conceitos-math-elementary_2",
      kind: "flashcard",
      prompt: "O que é notação científica?",
      concept_id: "55555555-5555-5555-5555-555555555551",
      position: 1,
    });

    // and the migrated card is immediately studyable
    await createUser(db, STUDENT_A, "student", "Ana Souza");
    await db.query(
      `update students set grade_level = 'elementary_2' where id = $1`,
      [STUDENT_A]
    );
    const result = await asUser(
      db,
      STUDENT_A,
      (tx) => review(tx, CARD, null, "good"),
      { now: WED_10AM }
    );
    expect(result).toMatchObject({
      grade: "good",
      concept_id: "55555555-5555-5555-5555-555555555551",
    });
  });
});
