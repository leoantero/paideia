// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildSeedSql, loadDecks } from "@/scripts/build-seed.mts";
import { asUser, createTestDb, createUser } from "./harness";
import { STUDENT_A, rpcJson } from "./fixtures";

describe("seed", () => {
  it("committed seed.sql matches content/decks (run npm run seed:build)", async () => {
    const { readFileSync } = await import("node:fs");
    // Normalized: git may check the file out with CRLF on Windows.
    expect(readFileSync("supabase/seed.sql", "utf8").replace(/\r\n/g, "\n")).toBe(buildSeedSql());
  });

  it("loads decks as pending review and a demo classroom a real student can join", async () => {
    const db = await createTestDb({ seed: true });
    await createUser(db, STUDENT_A, "student", "Estudante Real");

    const pending = await db.query<{ n: number }>(
      `select count(*)::int as n from decks where review_status = 'pending_review'`
    );
    expect(pending.rows[0].n).toBe(loadDecks().length);

    await db.exec(`update decks set review_status = 'approved'`);
    await asUser(db, STUDENT_A, (tx) => tx.query(`select join_classroom('8A-DEMO')`), { commit: true });

    const board = await asUser(db, STUDENT_A, (tx) =>
      rpcJson<{ member_count: number; entries: Array<{ is_me: boolean }> }>(
        tx,
        `select get_class_leaderboard() as r`
      )
    );
    expect(board.member_count).toBe(24);
    expect(board.entries.some((e) => e.is_me)).toBe(true);

    const queue = await asUser(db, STUDENT_A, (tx) =>
      rpcJson<Array<{ subject: string }>>(tx, `select get_study_queue() as r`)
    );
    expect(queue).toHaveLength(10);
    expect(new Set(queue.map((c) => c.subject)).size).toBe(4);
  });
});
