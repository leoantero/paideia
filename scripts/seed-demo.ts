import { admin, ensureUser, loadAuthUsers } from "./lib/admin";

/**
 * Seed da demo: 1 mantenedora -> 1 escola -> 1 turma (8º ano) -> 5 alunos,
 * + contas de responsável e de professor com credenciais conhecidas.
 *
 * Idempotente. NÃO usar em produção — cria contas com senhas fixas.
 */

const DEMO_PASSWORD = "***REDACTED-ROTATED-2026-10-04***";

const STUDENTS = [
  { matricula: "20250801", name: "Marina Rocha" },
  { matricula: "20250802", name: "Théo Almeida" },
  { matricula: "20250803", name: "Bruna Carvalho" },
  { matricula: "20250804", name: "Igor Nascimento" },
  { matricula: "20250805", name: "Lívia Fernandes" },
];

const PARENTS = [
  {
    email: "responsavel.marina@exemplo.com",
    name: "Patrícia Rocha",
    children: ["20250801"],
  },
  {
    email: "responsavel.theo@exemplo.com",
    name: "Carlos Almeida",
    children: ["20250802", "20250803"],
  },
  {
    email: "responsavel.igor@exemplo.com",
    name: "Sônia Nascimento",
    children: ["20250804"],
  },
  // 20250805 (Lívia) fica sem responsável vinculado — caso de borda pro painel.
];

const TEACHER = {
  email: "professora.matematica@escola-demo.com",
  name: "Débora Lima",
};

/** Gestor da unidade — escopo por `staff_assignments.school_id` (decisão #2). */
const GESTOR = { email: "gestor@escola-demo.com", name: "Renata Duarte" };

const studentEmail = (matricula: string) => `${matricula}@aluno.paideia.app`;

async function upsertReturning<T extends Record<string, unknown>>(
  table: string,
  match: Record<string, unknown>,
  insert: T
): Promise<{ id: string }> {
  const { data: found } = await admin
    .from(table)
    .select("id")
    .match(match)
    .maybeSingle();
  if (found) return found as { id: string };
  const { data, error } = await admin
    .from(table)
    .insert(insert)
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error(`insert ${table} falhou`);
  return data as { id: string };
}

async function main() {
  const users = await loadAuthUsers();

  // 1. rede -> escola -> turma
  const org = await upsertReturning(
    "organizations",
    { slug: "rede-demo" },
    {
      name: "Rede Demo de Ensino",
      slug: "rede-demo",
      seat_price_cents: 4990,
      contract_started_at: "2026-02-01",
    }
  );
  const SCHOOL_NAME = "Colégio Demo — Unidade Centro";
  const school = await upsertReturning(
    "schools",
    { organization_id: org.id, name: SCHOOL_NAME },
    {
      organization_id: org.id,
      name: SCHOOL_NAME,
      city: "São Paulo",
      state: "SP",
    }
  );
  const klass = await upsertReturning(
    "school_classes",
    { school_id: school.id, name: "8º ano B", academic_year: 2026 },
    {
      school_id: school.id,
      name: "8º ano B",
      grade_year: 8,
      academic_year: 2026,
    }
  );
  console.log(`Rede/escola/turma ok (turma ${klass.id}).`);

  // 2. alunos: cria auth user (trigger cria profile + students), define série, matricula
  const studentIdByMatricula = new Map<string, string>();
  for (const s of STUDENTS) {
    const uid = await ensureUser(
      users,
      studentEmail(s.matricula),
      DEMO_PASSWORD,
      {
        role: "student",
        full_name: s.name,
      }
    );
    studentIdByMatricula.set(s.matricula, uid);

    await admin
      .from("students")
      .update({ grade_level: "elementary_2", school_name: SCHOOL_NAME })
      .eq("id", uid);

    const { data: enr } = await admin
      .from("enrollments")
      .select("id")
      .match({ student_id: uid, class_id: klass.id })
      .maybeSingle();
    if (!enr) {
      const { error } = await admin
        .from("enrollments")
        .insert({ student_id: uid, class_id: klass.id, status: "active" });
      if (error) throw error;
    }
  }
  console.log(`${STUDENTS.length} alunos matriculados.`);

  // 3. responsáveis + vínculo
  for (const p of PARENTS) {
    const uid = await ensureUser(users, p.email, DEMO_PASSWORD, {
      role: "parent",
      full_name: p.name,
    });
    for (const m of p.children) {
      const studentId = studentIdByMatricula.get(m);
      if (!studentId) continue;
      const { data: link } = await admin
        .from("parent_student_links")
        .select("id")
        .match({ parent_id: uid, student_id: studentId })
        .maybeSingle();
      if (!link) {
        const { error } = await admin
          .from("parent_student_links")
          .insert({ parent_id: uid, student_id: studentId, status: "active" });
        if (error) throw error;
      }
    }
  }
  console.log(`${PARENTS.length} responsáveis vinculados.`);

  // 4. professora + atribuição à turma
  const teacherId = await ensureUser(users, TEACHER.email, DEMO_PASSWORD, {
    role: "teacher",
    full_name: TEACHER.name,
  });
  const { data: sa } = await admin
    .from("staff_assignments")
    .select("id")
    .match({ profile_id: teacherId, class_id: klass.id })
    .maybeSingle();
  if (!sa) {
    const { error } = await admin
      .from("staff_assignments")
      .insert({ profile_id: teacherId, class_id: klass.id, subject: "math" });
    if (error) throw error;
  }
  console.log("Professora atribuída à turma.");

  // 5. gestor da unidade — escopo por school_id, não por turma
  const gestorId = await ensureUser(users, GESTOR.email, DEMO_PASSWORD, {
    role: "director",
    full_name: GESTOR.name,
  });
  const { data: ga } = await admin
    .from("staff_assignments")
    .select("id")
    .match({ profile_id: gestorId, school_id: school.id })
    .maybeSingle();
  if (!ga) {
    const { error } = await admin
      .from("staff_assignments")
      .insert({ profile_id: gestorId, school_id: school.id });
    if (error) throw error;
  }
  console.log("Gestor vinculado à unidade.");

  console.log("\n--- CREDENCIAIS DA DEMO (senha única) ---");
  console.log(`senha: ${DEMO_PASSWORD}\n`);
  console.log("ALUNOS (login por matrícula):");
  for (const s of STUDENTS) console.log(`  ${s.matricula}  ${s.name}`);
  console.log("RESPONSÁVEIS (login por e-mail):");
  for (const p of PARENTS) console.log(`  ${p.email}  (${p.name})`);
  console.log("PROFESSORA (login por e-mail):");
  console.log(`  ${TEACHER.email}  (${TEACHER.name})`);
  console.log("GESTOR (login por e-mail):");
  console.log(`  ${GESTOR.email}  (${GESTOR.name})`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
