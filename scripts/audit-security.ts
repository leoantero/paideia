import { demoPassword } from "./lib/admin";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

/**
 * Auditoria de isolamento — roda contra o banco REAL com as contas da demo,
 * usando a anon key (exatamente o que um usuário tem no navegador).
 *
 * Por que isto existe: as promessas de privacidade do produto ("o responsável
 * vê domínio, nunca a conversa"; "o professor vê agregado, nunca o evento")
 * são vendidas para a rede e assinadas em DPA. Promessa que não tem teste
 * executável é promessa que vai quebrar numa refatoração silenciosa — e você
 * só descobre no vazamento.
 *
 * Rodar antes de qualquer demo e antes de qualquer merge que toque RLS:
 *   npm run audit:security
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = demoPassword();

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results: { name: string; pass: boolean }[] = [];

function check(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass });
  console.log(
    `  ${pass ? "ok  " : "FALHA"} | ${name}${detail ? ` — ${detail}` : ""}`
  );
}

async function login(
  email: string
): Promise<{ c: SupabaseClient; uid: string }> {
  const c = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await c.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { c, uid: data.user.id };
}

async function main() {
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "student");
  const marina = (profiles ?? []).find((s) => s.full_name === "Marina Rocha");
  if (!marina)
    throw new Error("Base de demo ausente — rode `npm run seed` antes.");

  console.log("\n=== ALUNO ===");
  const st = await login("20250801@aluno.paideia.app");
  {
    const { data: ev } = await st.c
      .from("learning_events")
      .select("student_id");
    check(
      "aluno não vê evidência de outro aluno",
      (ev ?? []).every((r) => r.student_id === st.uid),
      `${(ev ?? []).length} linhas`
    );
    const { data: cm } = await st.c
      .from("concept_mastery")
      .select("student_id");
    check(
      "aluno não vê domínio de outro aluno",
      (cm ?? []).every((r) => r.student_id === st.uid)
    );
    const { error } = await st.c
      .from("profiles")
      .update({ role: "director" })
      .eq("id", st.uid);
    check("aluno não consegue escalar o próprio papel", !!error, error?.code);
    const { data: q } = await st.c.from("questions").select("id");
    check(
      "aluno não vê o banco de questões do professor",
      (q ?? []).length === 0
    );
    const { data: pq } = await st.c.from("public_questions").select("id");
    check(
      "aluno não lê public_questions direto (só via RPC)",
      (pq ?? []).length === 0
    );
    const { data: qa } = await st.c
      .from("question_attempts")
      .select("student_id");
    check(
      "aluno não vê tentativa de outro aluno",
      (qa ?? []).every((r) => r.student_id === st.uid)
    );
  }

  console.log("\n=== RESPONSÁVEL ===");
  const pr = await login("responsavel.marina@exemplo.com");
  {
    const { data: cm } = await pr.c
      .from("concept_mastery")
      .select("student_id");
    const students = new Set((cm ?? []).map((r) => r.student_id));
    check(
      "responsável vê somente o próprio filho",
      students.size <= 1 && (students.size === 0 || students.has(marina.id)),
      `${students.size} aluno(s)`
    );
    const { data: le } = await pr.c.from("learning_events").select("id");
    check(
      "responsável NÃO vê evidência bruta do filho",
      (le ?? []).length === 0
    );
    const { data: msg } = await pr.c.from("messages").select("id");
    check("responsável NÃO vê conversas do filho", (msg ?? []).length === 0);
  }

  console.log("\n=== PROFESSOR ===");
  const tc = await login("professora.matematica@escola-demo.com");
  {
    const { data: le } = await tc.c.from("learning_events").select("id");
    check("professor NÃO vê evidência bruta", (le ?? []).length === 0);
    const { data: msg } = await tc.c.from("messages").select("id");
    check("professor NÃO vê conversas de aluno", (msg ?? []).length === 0);
    const { data: qa } = await tc.c.from("question_attempts").select("id");
    check("professor NÃO vê tentativas de questão", (qa ?? []).length === 0);

    const { data: before } = await admin
      .from("concept_mastery")
      .select("mastery")
      .eq("student_id", marina.id)
      .limit(1)
      .single();
    await tc.c
      .from("concept_mastery")
      .update({ mastery: 0.99 })
      .eq("student_id", marina.id);
    const { data: after } = await admin
      .from("concept_mastery")
      .select("mastery")
      .eq("student_id", marina.id)
      .limit(1)
      .single();
    check(
      "professor não consegue reescrever domínio de aluno",
      before?.mastery === after?.mastery
    );
  }

  console.log("\n=== GESTOR ===");
  const gs = await login("gestor@escola-demo.com");
  {
    const { data: le } = await gs.c.from("learning_events").select("id");
    check("gestor NÃO vê evidência bruta", (le ?? []).length === 0);
    const { data: msg } = await gs.c.from("messages").select("id");
    check("gestor NÃO vê conversas", (msg ?? []).length === 0);
    const { data: q } = await gs.c.from("questions").select("id");
    check(
      "gestor NÃO vê o banco de questões do professor",
      (q ?? []).length === 0
    );
    const { data: qa } = await gs.c.from("question_attempts").select("id");
    check("gestor NÃO vê tentativas de questão", (qa ?? []).length === 0);
    const { data: ov } = await gs.c.rpc("school_overview");
    const row = Array.isArray(ov) ? ov[0] : ov;
    check(
      "gestor vê agregados da própria unidade",
      (row?.active_students ?? 0) > 0
    );
  }

  console.log("\n=== ANÔNIMO (sem login) ===");
  {
    const c = createClient(url, anon);
    const tables = [
      "profiles",
      "students",
      "concept_mastery",
      "learning_events",
      "messages",
      "conversations",
      "questions",
      "enrollments",
      "billable_seats",
      "student_progress",
      "reward_events",
      "card_states",
      "review_logs",
      "public_questions",
      "question_attempts",
      "simulation_completions",
      "question_origin_settings",
    ];
    for (const t of tables) {
      const { data } = await c.from(t).select("*").limit(1);
      check(`anônimo não lê ${t}`, (data ?? []).length === 0);
    }
  }

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n${results.length - failed.length}/${results.length} verificações passaram.`
  );
  if (failed.length > 0) {
    console.error(
      "\nFALHAS:\n" + failed.map((f) => `  - ${f.name}`).join("\n")
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
