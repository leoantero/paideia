// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./harness";
import { STUDENT_A, STUDENT_B } from "./fixtures";

let db: PGlite;

interface Decision {
  allowed: boolean;
  kind?: string;
  retry_after_seconds?: number;
}

const guard = async (user: string, route = "tutor/chat", hourly = 40) =>
  (
    await db.query<{ r: Decision }>(`select ai_guard($1, $2, $3) as r`, [
      user,
      route,
      hourly,
    ])
  ).rows[0].r;

/** Fills ai_route_calls as if `n` calls happened `hoursAgo` hours ago. */
async function pastCalls(
  user: string,
  n: number,
  hoursAgo: number,
  route = "tutor/chat"
) {
  await db.query(
    `insert into ai_route_calls (user_id, route, created_at)
     select $1, $2, now() - make_interval(hours => $3) from generate_series(1, $4)`,
    [user, route, hoursAgo, n]
  );
}

const alerts = async () =>
  (
    await db.query<{ kind: string; user_id: string }>(
      `select kind, user_id from ai_usage_alerts order by id`
    )
  ).rows;

beforeEach(async () => {
  db = await createTestDb();
});

describe("ai_guard", () => {
  it("lets a normal study day through without any alert", async () => {
    await pastCalls(STUDENT_A, 35, 3);
    await pastCalls(STUDENT_A, 35, 6);
    expect(await guard(STUDENT_A)).toEqual({ allowed: true });
    expect(await alerts()).toEqual([]);
  });

  it("holds the per-route hourly ceiling and records it once per hour", async () => {
    await pastCalls(STUDENT_A, 40, 0);
    const first = await guard(STUDENT_A);
    expect(first).toMatchObject({ allowed: false, kind: "hourly_limit" });
    await guard(STUDENT_A);
    expect(await alerts()).toEqual([
      { kind: "hourly_limit", user_id: STUDENT_A },
    ]);
    // another route still has room
    expect(await guard(STUDENT_A, "study/open", 60)).toEqual({ allowed: true });
  });

  it("flags automation: 200 calls in 24h across routes, even spread out", async () => {
    for (let h = 1; h <= 10; h++)
      await pastCalls(STUDENT_A, 20, h, h % 2 ? "tutor/chat" : "study/open");
    expect(await guard(STUDENT_A)).toMatchObject({
      allowed: false,
      kind: "daily_limit",
    });
    expect(await guard(STUDENT_B)).toEqual({ allowed: true });
    expect((await alerts()).map((a) => a.kind)).toEqual(["daily_limit"]);
  });

  it("trips the global breaker for everyone", async () => {
    await db.query(`update ai_usage_limits set global_daily_limit = 5`);
    await pastCalls(STUDENT_B, 5, 2);
    expect(await guard(STUDENT_A)).toMatchObject({
      allowed: false,
      kind: "global_limit",
    });
  });

  it("is reachable only with the service role", async () => {
    await db.transaction(async (tx) => {
      await tx.exec(`set local role authenticated`);
      await expect(
        tx.query(`select ai_guard($1, 'tutor/chat', 40)`, [STUDENT_A])
      ).rejects.toThrow(/permission denied/);
    });
  });
});

describe("ai_usage_check", () => {
  const check = (token: string | null) =>
    db.transaction(async (tx) => {
      await tx.exec(`set local role anon`);
      return (
        await tx.query<{ r: Record<string, unknown> }>(
          `select ai_usage_check($1) as r`,
          [token]
        )
      ).rows[0].r;
    });

  it("refuses without the monitor token", async () => {
    await expect(check("anything")).rejects.toThrow(/Not authorized/);
    await db.query(
      `update ai_usage_limits set monitor_token_hash = sha256(convert_to('s3cret', 'UTF8'))`
    );
    await expect(check("wrong")).rejects.toThrow(/Not authorized/);
  });

  it("summarizes suspicious usage with counts only", async () => {
    await db.query(
      `update ai_usage_limits set monitor_token_hash = sha256(convert_to('s3cret', 'UTF8'))`
    );
    await db.query(
      `insert into ai_usage_alerts (user_id, kind, route, created_at) values
         ($1, 'daily_limit', 'tutor/chat', now()),
         ($2, 'hourly_limit', 'tutor/chat', now() - interval '1 hour'),
         ($2, 'hourly_limit', 'tutor/chat', now() - interval '3 hours'),
         ($2, 'hourly_limit', 'tutor/chat', now() - interval '5 hours')`,
      [STUDENT_A, STUDENT_B]
    );
    const summary = await check("s3cret");
    expect(summary).toMatchObject({
      users_at_daily_limit: 1,
      users_hitting_hourly_limit_3h: 1,
      global_limit_hit: false,
    });
    expect(JSON.stringify(summary)).not.toContain(STUDENT_A);
  });
});
