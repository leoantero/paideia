// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createTestDb, createUser } from "./harness";
import {
  CONCEPT,
  PARENT,
  STUDENT_A,
  THU_10AM,
  WED_10AM,
  insertDeck,
  review,
  rpcJson,
} from "./fixtures";

let db: PGlite;

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, STUDENT_A, "student", "Ana Souza");
  await createUser(db, PARENT, "parent", "Mãe da Ana");
  await db.query(
    `insert into parent_student_links (parent_id, student_id) values ($1, $2)`,
    [PARENT, STUDENT_A]
  );
});

async function schedule(
  reps: number,
  ease: number,
  interval: number,
  grade: string
) {
  const res = await db.query<{
    repetitions: number;
    ease: string;
    interval_days: number;
  }>(`select * from sm2_schedule($1, $2, $3, $4::review_grade)`, [
    reps,
    ease,
    interval,
    grade,
  ]);
  return res.rows[0];
}

describe("sm2_schedule", () => {
  it("grows intervals 1 → 3 → interval×ease on consecutive 'good'", async () => {
    expect((await schedule(0, 2.5, 0, "good")).interval_days).toBe(1);
    expect((await schedule(1, 2.5, 1, "good")).interval_days).toBe(3);
    expect((await schedule(2, 2.5, 3, "good")).interval_days).toBe(8);
  });

  it("'again' resets repetitions, lowers ease and brings the card back today", async () => {
    const next = await schedule(4, 2.5, 20, "again");
    expect(next.repetitions).toBe(0);
    expect(Number(next.ease)).toBeCloseTo(2.3);
    expect(next.interval_days).toBe(0);
  });

  it("'easy' jumps further and never lets ease drop below 1.3 on 'hard'", async () => {
    expect((await schedule(0, 2.5, 0, "easy")).interval_days).toBe(3);
    expect(Number((await schedule(3, 1.35, 5, "hard")).ease)).toBeCloseTo(1.3);
  });

  it("caps intervals at 180 days", async () => {
    expect((await schedule(9, 3, 150, "easy")).interval_days).toBe(180);
  });
});

describe("record_review", () => {
  it("grades multiple choice on the server and remembers mistakes", async () => {
    const deck = await insertDeck(db);

    const wrong = await asUser(
      db,
      STUDENT_A,
      (tx) => review(tx, `${deck}-mc`, "0"),
      { now: WED_10AM }
    );
    expect(wrong.correct).toBe(false);
    expect(wrong.grade).toBe("again");
    expect(wrong.next_due_on).toBe("2026-09-30");
    expect(wrong.answer).toBe("Gás carbônico");

    const right = await asUser(
      db,
      STUDENT_A,
      (tx) => review(tx, `${deck}-mc`, "1"),
      { now: WED_10AM }
    );
    expect(right.correct).toBe(true);
    expect(right.next_due_on).toBe("2026-10-01");
  });

  it("accepts short answers regardless of accents, case and punctuation", async () => {
    const deck = await insertDeck(db);
    const result = await asUser(
      db,
      STUDENT_A,
      (tx) => review(tx, `${deck}-short`, "  Fotossintese. "),
      {
        now: WED_10AM,
      }
    );
    expect(result.correct).toBe(true);

    const empty = await asUser(
      db,
      STUDENT_A,
      (tx) => review(tx, `${deck}-short`, ""),
      { now: WED_10AM }
    );
    expect(empty.correct).toBe(false);
  });

  it("requires an evaluated grade for open cards", async () => {
    const deck = await insertDeck(db);
    await expect(
      asUser(db, STUDENT_A, (tx) => review(tx, `${deck}-open`, "porque sim"), {
        now: WED_10AM,
      })
    ).rejects.toThrow(/require a grade/);

    const graded = await asUser(
      db,
      STUDENT_A,
      (tx) => review(tx, `${deck}-open`, null, "hard"),
      {
        now: WED_10AM,
      }
    );
    expect(graded.grade).toBe("hard");
  });

  it("takes the student's own grade for flashcards and returns the concept anchor", async () => {
    const deck = await insertDeck(db);
    await expect(
      asUser(db, STUDENT_A, (tx) => review(tx, `${deck}-flash`, null), {
        now: WED_10AM,
      })
    ).rejects.toThrow(/require a grade/);

    const graded = await asUser(
      db,
      STUDENT_A,
      (tx) => review(tx, `${deck}-flash`, null, "easy"),
      {
        now: WED_10AM,
      }
    );
    expect(graded).toMatchObject({
      grade: "easy",
      interval_days: 3,
      concept_id: CONCEPT,
      first_today: true,
    });

    const unanchored = await asUser(
      db,
      STUDENT_A,
      (tx) => review(tx, `${deck}-mc`, "1"),
      { now: WED_10AM }
    );
    expect(unanchored.concept_id).toBeNull();
  });

  it("refuses cards that are not due yet and awards points once per card per day", async () => {
    const deck = await insertDeck(db);
    const card = `${deck}-mc`;

    await asUser(
      db,
      STUDENT_A,
      async (tx) => {
        const first = await review(tx, card, "0");
        expect(first.points).toBe(2);
        const retry = await review(tx, card, "1");
        expect(retry.points).toBe(0);
        await expect(review(tx, card, "1")).rejects.toThrow(/not due/);
      },
      { now: WED_10AM }
    );

    const nextDay = await asUser(db, STUDENT_A, (tx) => review(tx, card, "1"), {
      now: THU_10AM,
    });
    expect(nextDay.points).toBe(8);
    expect(nextDay.coins).toBe(1);
  });

  it("limits new cards per day by grade band", async () => {
    const deck = await insertDeck(db, { extraCards: 3 });
    await asUser(
      db,
      STUDENT_A,
      async (tx) => {
        const cards = [
          `${deck}-mc`,
          `${deck}-short`,
          `${deck}-x0`,
          `${deck}-x1`,
          `${deck}-x2`,
        ];
        for (const id of cards) await review(tx, id, "sim");
        await expect(review(tx, `${deck}-open`, null, "good")).rejects.toThrow(
          /new-card limit/
        );
      },
      { now: WED_10AM }
    );
  });

  it("hides and blocks decks still pending human review", async () => {
    const deck = await insertDeck(db, { status: "pending_review" });
    await asUser(
      db,
      STUDENT_A,
      async (tx) => {
        const cards = await tx.query(`select id from cards`);
        expect(cards.rows).toHaveLength(0);
        await expect(review(tx, `${deck}-mc`, "1")).rejects.toThrow(
          /not available/
        );
      },
      { now: WED_10AM }
    );
  });

  it("completes the daily goal once, from accumulated study time", async () => {
    const deck = await insertDeck(db, { extraCards: 3 });
    const results = await asUser(
      db,
      STUDENT_A,
      async (tx) => {
        const out = [];
        for (const id of [
          `${deck}-mc`,
          `${deck}-short`,
          `${deck}-x0`,
          `${deck}-x1`,
          `${deck}-x2`,
        ]) {
          out.push(await review(tx, id, "sim", null, 60000));
        }
        return out;
      },
      { now: WED_10AM }
    );
    expect(results.map((r) => r.daily_goal_completed)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
  });
});

describe("study queue and progress", () => {
  it("serves due cards before new ones and never sends answers", async () => {
    const deck = await insertDeck(db);
    await asUser(db, STUDENT_A, (tx) => review(tx, `${deck}-short`, "x"), {
      now: WED_10AM,
      commit: true,
    });

    const queue = await asUser(
      db,
      STUDENT_A,
      (tx) =>
        rpcJson<Array<Record<string, unknown>>>(
          tx,
          `select get_study_queue() as r`
        ),
      { now: WED_10AM }
    );
    expect(queue[0]).toMatchObject({ id: `${deck}-short`, is_new: false });
    expect(queue.slice(1).every((c) => c.is_new)).toBe(true);
    expect(
      queue.every((c) => !("answer" in c) && !("correct_choice" in c))
    ).toBe(true);
    // only the self-graded flashcard shows its back before grading
    expect(queue.filter((c) => c.back !== null).map((c) => c.kind)).toEqual([
      "flashcard",
    ]);
  });

  it("reports progress for the home screen", async () => {
    const deck = await insertDeck(db);
    await asUser(
      db,
      STUDENT_A,
      (tx) => review(tx, `${deck}-mc`, "1", null, 30000),
      {
        now: WED_10AM,
        commit: true,
      }
    );

    const progress = await asUser(
      db,
      STUDENT_A,
      (tx) =>
        rpcJson<Record<string, unknown>>(tx, `select get_my_progress() as r`),
      { now: WED_10AM }
    );
    expect(progress).toMatchObject({
      coins: 1,
      weekly_points: 8,
      streak: 1,
      active_today: true,
      daily_goal_minutes: 5,
      study_seconds_today: 30,
      due_today: 0,
      new_available: 3,
    });
  });
});

describe("privacy and integrity", () => {
  it("never shows per-card history to the linked parent", async () => {
    const deck = await insertDeck(db);
    await asUser(db, STUDENT_A, (tx) => review(tx, `${deck}-mc`, "1"), {
      now: WED_10AM,
      commit: true,
    });

    await asUser(db, PARENT, async (tx) => {
      expect((await tx.query(`select * from review_logs`)).rows).toHaveLength(
        0
      );
      expect((await tx.query(`select * from card_states`)).rows).toHaveLength(
        0
      );
    });
  });

  it("blocks students from writing rewards or scheduling state directly", async () => {
    const deck = await insertDeck(db);
    await asUser(db, STUDENT_A, async (tx) => {
      await expect(
        tx.query(
          `insert into reward_events (student_id, source, points, coins) values ($1, 'card_review', 999, 999)`,
          [STUDENT_A]
        )
      ).rejects.toThrow(/row-level security/);
    });
    await asUser(db, STUDENT_A, async (tx) => {
      await expect(
        tx.query(`select award_reward($1, 'card_review', 999, 999, null)`, [
          STUDENT_A,
        ])
      ).rejects.toThrow(/permission denied/);
    });
    await asUser(db, STUDENT_A, async (tx) => {
      await expect(
        tx.query(
          `insert into card_states (student_id, card_id, due_on) values ($1, $2, current_date)`,
          [STUDENT_A, `${deck}-mc`]
        )
      ).rejects.toThrow(/row-level security/);
    });
  });
});
