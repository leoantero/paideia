import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Runs the real supabase/migrations against an in-process Postgres (PGlite),
 * so schema, RLS and security-definer RPCs are tested without Docker.
 * The stub below mimics only the Supabase pieces the migrations rely on.
 */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    encrypted_password text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    raw_app_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const ROOT = path.resolve(__dirname, "../../..");

const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

/**
 * `stopBefore` (e.g. "0021") leaves the database one step behind, so a test
 * can load old-shape data and then run the rest with applyMigrations().
 */
export async function createTestDb(
  options: { stopBefore?: string } = {}
): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await applyMigrations(db, { to: options.stopBefore });
  return db;
}

export async function applyMigrations(
  db: PGlite,
  { from, to }: { from?: string; to?: string } = {}
): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => (!from || f >= from) && (!to || f < to));
  for (const file of files) {
    try {
      await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }
}

/**
 * Creates an auth user; the handle_new_user() trigger fills profiles/students.
 * The role goes in app_metadata — the only place 0013 trusts it from.
 */
export async function createUser(
  db: PGlite,
  id: string,
  role: "student" | "parent" | "teacher" | "director",
  fullName: string
): Promise<void> {
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
     values ($1, $2, $3, $4)`,
    [
      id,
      `${id}@test.local`,
      JSON.stringify({ full_name: fullName }),
      JSON.stringify({ role }),
    ]
  );
}

export type Tx = Pick<PGlite, "query" | "exec">;

/**
 * Runs `fn` as the given user under RLS, inside a transaction that is
 * rolled back afterwards unless `commit` is set. `now` pins app_now().
 */
export async function asUser<T>(
  db: PGlite,
  userId: string,
  fn: (tx: Tx) => Promise<T>,
  { commit = false, now }: { commit?: boolean; now?: string } = {}
): Promise<T> {
  return db.transaction(async (tx) => {
    if (now) {
      await tx.query(`select set_config('paideia.now', $1, true)`, [now]);
    }
    await tx.exec(`set local role authenticated`);
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    const result = await fn(tx);
    if (!commit) await tx.rollback();
    return result;
  });
}
