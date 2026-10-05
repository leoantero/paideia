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

describe("keepalive", () => {
  it("lets the anonymous key run a real query without reading any data", async () => {
    const db = await createTestDb();
    const now = await db.transaction(async (tx) => {
      await tx.exec(`set local role anon`);
      const res = await tx.query<{ t: Date }>(`select keepalive() as t`);
      return res.rows[0].t;
    });
    expect(now).toBeInstanceOf(Date);
  });
});

describe("0024 lint hardening", () => {
  it("keeps privileged functions away from the anon key and pins search_path", async () => {
    const db = await createTestDb();

    const exposed = await db.query<{ fn: string }>(`
      select p.proname as fn
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
        and has_function_privilege('anon', p.oid, 'execute')`);
    expect(exposed.rows).toEqual([]);

    const unpinned = await db.query<{ fn: string }>(`
      select p.proname as fn
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind = 'f'
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`);
    expect(unpinned.rows).toEqual([]);

    const trigger = await db.query<{ ok: boolean }>(
      `select has_function_privilege('authenticated', 'handle_new_user()', 'execute') as ok`
    );
    expect(trigger.rows[0].ok).toBe(false);
  });
});
