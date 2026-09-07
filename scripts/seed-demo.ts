import { admin, ensureUser, loadAuthUsers } from "./lib/admin";

/**
 * Seed da demo: 1 mantenedora -> 1 escola -> 2 turmas -> 8 alunos,
 * + responsáveis, 3 professores e 1 gestor, todos com credenciais conhecidas.
 *
 * POR QUE DUAS TURMAS: com todo mundo na mesma turma, a aba "Professores" do
 * gestor mostra três linhas com engajamento idêntico — parece defeito, não
 * comparação. Turmas separadas fazem aquela tela dizer alguma coisa.
 *
 * Idempotente. NÃO usar em produção — cria contas com senha fixa.
 */

const DEMO_PASSWORD = "***REDACTED-ROTATED-2026-10-04***";

const CLASS_B = "8º ano B";
const CLASS_A = "8º ano A";

const STUDENTS = [
  // 8º B — a turma com histórico denso; sustenta o heatmap e o caso da Bruna
  { matricula: "20250801", name: "Marina Rocha", turma: CLASS_B },
  { matricula: "20250802", name: "Théo Almeida", turma: CLASS_B },
  { matricula: "20250803", name: "Bruna Carvalho", turma: CLASS_B },
  { matricula: "20250804", name: "Igor Nascimento", turma: CLASS_B },
  { matricula: "20250805", name: "Lívia Fernandes", turma: CLASS_B },
  // 8º A — turma menor, uso mais baixo: é o contraste que o gestor precisa ver
  { matricula: "20250811", name: "Rafael Moreira", turma: CLASS_A },
  { matricula: "20250812", name: "Helena Braga", turma: CLASS_A },
  { matricula: "20250813", name: "Caio Ferreira", turma: CLASS_A },
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
  {
    email: "responsavel.rafael@exemplo.com",
    name: "Marcos Moreira",
    children: ["20250811", "20250812"],
  },
  // 20250805 (Lívia) e 20250813 (Caio) ficam sem responsável vinculado —
  // é o que faz a aba "Responsáveis" do gestor ter um número pra cobrar.
];

/**
 * Três professores em recortes diferentes. O engajamento de cada um sai da
 * turma dele, então os números do painel do gestor divergem de verdade.
 */
const TEACHERS = [
  {
    email: "professora.matematica@escola-demo.com",
    name: "Débora Lima",
    subject: "math",
    turma: CLASS_B,
  },
  {
    email: "professor.portugues@escola-demo.com",
    name: "Rogério Sales",
    subject: "language",
    turma: CLASS_B,
  },
  {
    email: "professora.ciencias@escola-demo.com",
    name: "Juliana Prado",
    subject: "biology",
    turma: CLASS_A,
  },
];

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
  const classIdByName = new Map<string, string>();
  for (const name of [CLASS_B, CLASS_A]) {
    const row = await upsertReturning(
      "school_classes",
      { school_id: school.id, name, academic_year: 2026 },
      { school_id: school.id, name, grade_year: 8, academic_year: 2026 }
    );
    classIdByName.set(name, row.id);
  }
  console.log(`Rede/escola ok — ${classIdByName.size} turmas.`);

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

    const classId = classIdByName.get(s.turma)!;
    const { data: enr } = await admin
      .from("enrollments")
      .select("id")
      .match({ student_id: uid, class_id: classId })
      .maybeSingle();
    if (!enr) {
      const { error } = await admin
        .from("enrollments")
        .insert({ student_id: uid, class_id: classId, status: "active" });
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

  // 4. professores + atribuição à turma da matéria de cada um
  for (const t of TEACHERS) {
    const teacherId = await ensureUser(users, t.email, DEMO_PASSWORD, {
      role: "teacher",
      full_name: t.name,
    });
    const classId = classIdByName.get(t.turma)!;
    const { data: sa } = await admin
      .from("staff_assignments")
      .select("id")
      .match({ profile_id: teacherId, class_id: classId })
      .maybeSingle();
    if (!sa) {
      const { error } = await admin
        .from("staff_assignments")
        .insert({
          profile_id: teacherId,
          class_id: classId,
          subject: t.subject,
        });
      if (error) throw error;
    }
  }
  console.log(`${TEACHERS.length} professores atribuídos.`);

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
  for (const s of STUDENTS) {
    console.log(`  ${s.matricula}  ${s.name.padEnd(18)} ${s.turma}`);
  }
  console.log("RESPONSÁVEIS (login por e-mail):");
  for (const p of PARENTS) console.log(`  ${p.email.padEnd(38)} ${p.name}`);
  console.log("PROFESSORES (login por e-mail):");
  for (const t of TEACHERS) {
    console.log(`  ${t.email.padEnd(38)} ${t.name.padEnd(16)} ${t.turma}`);
  }
  console.log("GESTOR (login por e-mail):");
  console.log(`  ${GESTOR.email.padEnd(38)} ${GESTOR.name}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
