import "server-only";
import { createAdminClient } from "@/src/lib/supabase/admin";
import type { Role } from "@/src/core/auth/types";

/**
 * PAINEL DE DEMONSTRAÇÃO — atalho para entrar em qualquer perfil.
 *
 * ⚠️ Isto é, por construção, a mesma coisa que a vulnerabilidade fechada em
 * 0013_harden_privileges.sql: um jeito de virar gestor sem ser gestor. A
 * diferença — a única — é o portão abaixo. Trate-o como código de segurança,
 * não como conveniência de dev.
 *
 * REGRAS:
 *  - Desligado por padrão. Só existe se PAIDEIA_DEV_PANEL=1 estiver no
 *    ambiente. Sem a variável, a rota /dev responde 404 (não redirect: um
 *    redirect confirmaria que a rota existe).
 *  - As contas que ele cria usam a senha única da demo e vivem na mesma base
 *    de mentira do seed. NUNCA ligue isto num ambiente com aluno de verdade —
 *    no minuto em que existir dado de escola real, esta variável sai do
 *    ambiente e este diretório sai do repositório.
 *  - Não usa nada além do que o seed já usa. Não é uma porta nova para o
 *    banco; é o seed exposto numa tela.
 */

/** A senha das contas da demo vem do .env.local — nunca do repositório. */
export const DEMO_PASSWORD = process.env.PAIDEIA_DEMO_PASSWORD ?? "";

export function isDevPanelEnabled(): boolean {
  return process.env.PAIDEIA_DEV_PANEL === "1";
}

export interface DemoAccount {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  /** o que a conta enxerga — ajuda quem testa a escolher */
  scope: string;
}

const ROLE_ORDER: Record<string, number> = {
  student: 0,
  parent: 1,
  teacher: 2,
  director: 3,
};

/** Lista todo mundo que existe na base de demonstração, com o escopo de cada um. */
export async function listDemoAccounts(): Promise<DemoAccount[]> {
  const admin = createAdminClient();

  const { data: users } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, full_name");
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const accounts: DemoAccount[] = [];

  for (const u of users?.users ?? []) {
    const p = profileById.get(u.id);
    if (!p || !u.email) continue;

    accounts.push({
      id: u.id,
      email: u.email,
      fullName: (p.full_name as string) ?? "—",
      role: p.role as Role,
      scope: await describeScope(p.role as Role, u.id),
    });
  }

  return accounts.sort(
    (a, b) =>
      (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) ||
      a.fullName.localeCompare(b.fullName)
  );
}

async function describeScope(role: Role, id: string): Promise<string> {
  const admin = createAdminClient();

  if (role === "student") {
    const { count } = await admin
      .from("learning_events")
      .select("*", { count: "exact", head: true })
      .eq("student_id", id);
    return `${count ?? 0} evidências registradas`;
  }
  if (role === "parent") {
    const { data } = await admin
      .from("parent_student_links")
      .select("student_id")
      .eq("parent_id", id)
      .eq("status", "active");
    const ids = (data ?? []).map((l) => l.student_id as string);
    if (ids.length === 0) return "sem filho vinculado";
    const { data: kids } = await admin
      .from("profiles")
      .select("full_name")
      .in("id", ids);
    return (kids ?? [])
      .map((k) => (k.full_name as string).split(" ")[0])
      .join(", ");
  }
  const { data: sa } = await admin
    .from("staff_assignments")
    .select("class_id, school_id, organization_id")
    .eq("profile_id", id);
  const row = (sa ?? [])[0];
  if (!row) return "sem vínculo — não vê nada";
  if (row.class_id) return "vinculado a turma";
  if (row.school_id) return "vinculado à unidade";
  return "vinculado à rede";
}

/**
 * Cria uma conta de teste JÁ COM ESCOPO. Sem isso o perfil novo entra e vê
 * tela vazia — que é o oposto do objetivo (deixar quem testa VER cada app).
 */
export async function createTestAccount(
  role: Role,
  fullName: string
): Promise<{ email: string }> {
  const admin = createAdminClient();
  const stamp = Date.now().toString(36);
  const email =
    role === "student"
      ? `teste-${stamp}@aluno.paideia.app`
      : `teste-${role}-${stamp}@escola-demo.com`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw error ?? new Error("createUser falhou");
  const uid = data.user.id;

  // o papel é confirmado explicitamente — o gatilho sozinho não basta (ver 0017)
  const { error: roleErr } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", uid);
  if (roleErr) throw roleErr;

  // ── escopo: sem isto a conta nova não enxerga nada ──
  const { data: klass } = await admin
    .from("school_classes")
    .select("id, school_id")
    .limit(1)
    .maybeSingle();

  if (!klass) return { email };

  if (role === "student") {
    await admin
      .from("students")
      .update({
        grade_level: "elementary_2",
        school_name: "Colégio Demo — Unidade Centro",
      })
      .eq("id", uid);
    await admin
      .from("enrollments")
      .insert({ student_id: uid, class_id: klass.id, status: "active" });
  }

  if (role === "parent") {
    // vincula ao aluno com mais evidência, pro painel abrir com conteúdo
    const { data: kid } = await admin
      .from("enrollments")
      .select("student_id")
      .eq("class_id", klass.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (kid) {
      await admin.from("parent_student_links").insert({
        parent_id: uid,
        student_id: kid.student_id,
        status: "active",
      });
    }
  }

  if (role === "teacher") {
    await admin
      .from("staff_assignments")
      .insert({ profile_id: uid, class_id: klass.id, subject: "math" });
  }

  if (role === "director") {
    await admin
      .from("staff_assignments")
      .insert({ profile_id: uid, school_id: klass.school_id });
  }

  return { email };
}
