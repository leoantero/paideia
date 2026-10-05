// @vitest-environment node
import { describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser } from "./harness";

const STUDENT = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

describe("phase 1 schema", () => {
  it("applies all migrations and isolates students from each other", async () => {
    const db = await createTestDb();
    await createUser(db, STUDENT, "student", "Ana Souza");
    await createUser(db, OTHER, "student", "Bruno Lima");

    const rows = await asUser(db, STUDENT, (tx) =>
      tx.query<{ id: string }>(`select id from students`)
    );
    expect(rows.rows.map((r) => r.id)).toEqual([STUDENT]);
  });
});
