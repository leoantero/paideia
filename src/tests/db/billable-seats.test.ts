// @vitest-environment node
import { describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser } from "./harness";
import { STUDENT_A, enroll } from "./fixtures";

const DIRECTOR = "99999999-9999-9999-9999-999999999999";
const OUTSIDER = "88888888-8888-8888-8888-888888888888";

describe("billable_seats", () => {
  it("is not readable anonymously and follows the reader's RLS", async () => {
    const db = await createTestDb();
    await createUser(db, STUDENT_A, "student", "Ana Souza");
    await createUser(db, DIRECTOR, "director", "Diretora da Rede");
    await createUser(db, OUTSIDER, "director", "Diretor de Outra Rede");
    await enroll(db, [STUDENT_A]);
    await db.query(
      `insert into staff_assignments (profile_id, organization_id)
       values ($1, 'aaaaaaaa-0000-0000-0000-000000000000')`,
      [DIRECTOR]
    );

    await db.transaction(async (tx) => {
      await tx.exec(`set local role anon`);
      await expect(tx.query(`select * from billable_seats`)).rejects.toThrow(
        /permission denied/
      );
    });

    const own = await asUser(db, DIRECTOR, (tx) =>
      tx.query<{ active_seats: number }>(
        `select active_seats from billable_seats`
      )
    );
    expect(own.rows.map((r) => Number(r.active_seats))).toEqual([1]);

    for (const reader of [OUTSIDER, STUDENT_A]) {
      const rows = await asUser(db, reader, (tx) =>
        tx.query(`select * from billable_seats`)
      );
      expect(rows.rows).toHaveLength(0);
    }
  });
});
