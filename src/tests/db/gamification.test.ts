// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createTestDb, createUser } from "./harness";
import {
  FRI_10AM,
  MON_10AM,
  SAT_10AM,
  STUDENT_A,
  STUDENT_B,
  STUDENT_C,
  THU_10AM,
  WED_10AM,
  insertDeck,
  review,
  rpcJson,
} from "./fixtures";

let db: PGlite;

interface Progress {
  coins: number;
  streak: number;
  streak_freezes: number;
  active_today: boolean;
}

interface Leaderboard {
  classroom: { name: string; school: string } | null;
  member_count: number;
  entries: Array<{ position: number; name: string; weekly_points: number; delta: number | null; is_me: boolean }>;
}

const progress = (at: string, user = STUDENT_A) =>
  asUser(db, user, (tx) => rpcJson<Progress>(tx, `select get_my_progress() as r`), { now: at });

const leaderboard = (at: string, user = STUDENT_A) =>
  asUser(db, user, (tx) => rpcJson<Leaderboard>(tx, `select get_class_leaderboard() as r`), { now: at });

async function studyOnce(at: string, cardId: string, response = "1") {
  await asUser(db, STUDENT_A, (tx) => review(tx, cardId, response), { now: at, commit: true });
}

async function grantCoins(student: string, coins: number) {
  await db.query(`insert into student_progress (student_id, coins) values ($1, $2)
                  on conflict (student_id) do update set coins = excluded.coins`, [student, coins]);
}

async function addPoints(student: string, points: number, at: string) {
  await db.query(
    `insert into reward_events (student_id, source, points, coins, created_at) values ($1, 'card_review', $2, 0, $3)`,
    [student, points, at]
  );
}

beforeEach(async () => {
  db = await createTestDb();
  await createUser(db, STUDENT_A, "student", "Ana Souza");
  await createUser(db, STUDENT_B, "student", "Bruno Lima");
  await createUser(db, STUDENT_C, "student", "Carla");
});

describe("streak", () => {
  it("counts consecutive study days and resets after a missed day", async () => {
    const deck = await insertDeck(db, { extraCards: 3 });
    await studyOnce(WED_10AM, `${deck}-mc`);
    await studyOnce(THU_10AM, `${deck}-mc`);
    expect((await progress(THU_10AM)).streak).toBe(2);

    expect((await progress(SAT_10AM)).streak).toBe(0);
    await studyOnce(SAT_10AM, `${deck}-x0`, "sim");
    expect((await progress(SAT_10AM)).streak).toBe(1);
  });

  it("a streak freeze covers a missed day and is consumed on return", async () => {
    const deck = await insertDeck(db, { extraCards: 3 });
    await studyOnce(WED_10AM, `${deck}-mc`);
    await studyOnce(THU_10AM, `${deck}-mc`);
    await grantCoins(STUDENT_A, 60);

    const bought = await asUser(db, STUDENT_A, (tx) => rpcJson<Progress>(tx, `select buy_streak_freeze() as r`), {
      now: THU_10AM,
      commit: true,
    });
    expect(bought).toMatchObject({ coins: 10, streak_freezes: 1 });

    const saturday = await progress(SAT_10AM);
    expect(saturday.streak).toBe(2);
    expect(saturday.active_today).toBe(false);

    await studyOnce(SAT_10AM, `${deck}-x0`, "sim");
    expect(await progress(SAT_10AM)).toMatchObject({ streak: 3, streak_freezes: 0 });
  });

  it("enforces the freeze price and the 2-freeze maximum", async () => {
    await asUser(db, STUDENT_A, async (tx) => {
      await expect(tx.query(`select buy_streak_freeze()`)).rejects.toThrow(/Not enough coins/);
    });

    await grantCoins(STUDENT_A, 500);
    await asUser(
      db,
      STUDENT_A,
      async (tx) => {
        await tx.query(`select buy_streak_freeze()`);
        await tx.query(`select buy_streak_freeze()`);
        await expect(tx.query(`select buy_streak_freeze()`)).rejects.toThrow(/maximum/);
      },
      { now: WED_10AM }
    );
  });
});

describe("classroom", () => {
  async function createClassroom() {
    await db.exec(`
      insert into schools (id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Escola Demo');
      insert into classrooms (id, school_id, name, grade_level, school_year, join_code)
      values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '8º ano A', 'elementary_2', 2026, '8A-DEMO');
    `);
  }

  it("joins only by code and cannot move itself between classrooms directly", async () => {
    await createClassroom();
    const joined = await asUser(db, STUDENT_A, (tx) => rpcJson<{ classroom_name: string }>(tx, `select join_classroom(' 8a-demo ') as r`), {
      commit: true,
    });
    expect(joined.classroom_name).toBe("8º ano A");

    const grade = await db.query<{ grade_level: string; school_name: string }>(
      `select grade_level, school_name from students where id = $1`,
      [STUDENT_A]
    );
    expect(grade.rows[0]).toEqual({ grade_level: "elementary_2", school_name: "Escola Demo" });

    await asUser(db, STUDENT_B, async (tx) => {
      await expect(
        tx.query(`update students set classroom_id = 'bbbbbbbb-0000-0000-0000-000000000001' where id = $1`, [STUDENT_B])
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("ranks the week's points, shows short names and movement since yesterday", async () => {
    await createClassroom();
    await db.query(`update students set classroom_id = 'bbbbbbbb-0000-0000-0000-000000000001'`);

    await addPoints(STUDENT_A, 40, "2026-09-29T15:00:00-03:00");
    await addPoints(STUDENT_B, 50, "2026-09-29T15:00:00-03:00");
    await addPoints(STUDENT_B, 999, "2026-09-25T15:00:00-03:00"); // last week: ignored
    await addPoints(STUDENT_A, 30, "2026-09-30T09:00:00-03:00"); // today: A overtakes B

    const board = await leaderboard(WED_10AM);
    expect(board.classroom).toEqual({ name: "8º ano A", school: "Escola Demo" });
    expect(board.entries).toEqual([
      { position: 1, name: "Ana S.", weekly_points: 70, delta: 1, is_me: true },
      { position: 2, name: "Bruno L.", weekly_points: 50, delta: -1, is_me: false },
      { position: 3, name: "Carla", weekly_points: 0, delta: null, is_me: false },
    ]);
    expect(JSON.stringify(board)).not.toContain(STUDENT_B);
  });

  it("resets on Monday with no arrows yet", async () => {
    await createClassroom();
    await db.query(`update students set classroom_id = 'bbbbbbbb-0000-0000-0000-000000000001'`);
    await addPoints(STUDENT_A, 40, "2026-10-02T15:00:00-03:00");
    await addPoints(STUDENT_B, 10, "2026-10-05T09:00:00-03:00");

    const board = await leaderboard(MON_10AM);
    expect(board.entries[0]).toMatchObject({ name: "Bruno L.", weekly_points: 10, delta: null });
    expect(board.entries.find((e) => e.is_me)).toMatchObject({ weekly_points: 0 });
  });

  it("shows the top 10 plus the student's own row", async () => {
    await createClassroom();
    const ids: string[] = [];
    for (let i = 0; i < 11; i++) {
      const id = `cccccccc-0000-0000-0000-0000000000${String(i).padStart(2, "0")}`;
      ids.push(id);
      await createUser(db, id, "student", `Colega ${i}`);
      await addPoints(id, 100 + i, "2026-09-29T15:00:00-03:00");
    }
    await db.query(`update students set classroom_id = 'bbbbbbbb-0000-0000-0000-000000000001'`);

    const board = await leaderboard(FRI_10AM);
    expect(board.member_count).toBe(14);
    expect(board.entries).toHaveLength(11);
    expect(board.entries.at(-1)).toMatchObject({ is_me: true });
  });

  it("returns an empty board for a student without a classroom", async () => {
    const board = await leaderboard(WED_10AM, STUDENT_C);
    expect(board).toEqual({ classroom: null, entries: [], member_count: 0 });
  });
});

describe("tutor session reward", () => {
  it("rewards an engaged conversation once", async () => {
    const convo = "dddddddd-0000-0000-0000-000000000001";
    await db.query(`insert into conversations (id, student_id) values ($1, $2)`, [convo, STUDENT_A]);
    const addMessage = () =>
      db.query(`insert into messages (conversation_id, role, content) values ($1, 'student', 'oi')`, [convo]);

    await addMessage();
    await addMessage();
    const tooEarly = await asUser(db, STUDENT_A, (tx) => rpcJson<{ awarded: boolean }>(tx, `select reward_tutor_session($1) as r`, [convo]), { now: WED_10AM });
    expect(tooEarly.awarded).toBe(false);

    await addMessage();
    const first = await asUser(db, STUDENT_A, (tx) => rpcJson<{ awarded: boolean }>(tx, `select reward_tutor_session($1) as r`, [convo]), { now: WED_10AM, commit: true });
    expect(first).toEqual({ awarded: true, points: 15, coins: 3 });

    const again = await asUser(db, STUDENT_A, (tx) => rpcJson<{ awarded: boolean }>(tx, `select reward_tutor_session($1) as r`, [convo]), { now: WED_10AM });
    expect(again.awarded).toBe(false);

    await asUser(db, STUDENT_B, async (tx) => {
      await expect(tx.query(`select reward_tutor_session($1)`, [convo])).rejects.toThrow(/not found/);
    });
  });
});
