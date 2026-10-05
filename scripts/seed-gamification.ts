import { admin, loadAuthUsers } from "./lib/admin";

/**
 * Pontos e dracmas da semana para os alunos da demo — sem isso o Pódio abre
 * vazio e não dá para mostrar o ranking da turma.
 *
 * Os eventos levam `ref = 'seed-demo'` e são recriados a cada execução,
 * relativos a HOJE (o ranking zera toda segunda): rode de novo para
 * "atualizar" a semana. Pseudoaleatório com semente fixa, então a mesma
 * semana gera sempre o mesmo pódio. O saldo em student_progress é recalculado
 * a partir de TODO o ledger do aluno, então atividade real não se perde.
 */

const SEED_REF = "seed-demo";

// matrícula -> quão estudioso o aluno é na narrativa da demo (0..1)
const DILIGENCE: Record<string, number> = {
  "20250801": 0.95, // Marina — a mais constante
  "20250802": 0.7,
  "20250803": 0.6,
  "20250804": 0.2, // Igor — poucos dados, igual ao seed de evidência
  "20250805": 0.8,
  "20250811": 0.55,
  "20250812": 0.4,
  "20250813": 0.25,
};

const studentEmail = (matricula: string) => `${matricula}@aluno.paideia.app`;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Data local da escola (America/Sao_Paulo, UTC−3 sem horário de verão). */
function schoolDate(daysAgo: number): string {
  const local = new Date(Date.now() - 3 * 3600_000 - daysAgo * 86_400_000);
  return local.toISOString().slice(0, 10);
}

async function main() {
  const users = await loadAuthUsers();
  // segunda = 0 … domingo = 6, no calendário da escola
  const weekday = (new Date(`${schoolDate(0)}T12:00:00Z`).getUTCDay() + 6) % 7;
  const rand = mulberry32(Number(schoolDate(weekday).replace(/-/g, "")));

  for (const [matricula, diligence] of Object.entries(DILIGENCE)) {
    const user = users.get(studentEmail(matricula));
    if (!user) {
      console.warn(`[seed-gamification] usuário não encontrado: ${matricula}`);
      continue;
    }

    const { error: delErr } = await admin
      .from("reward_events")
      .delete()
      .eq("student_id", user.id)
      .eq("ref", SEED_REF);
    if (delErr) throw delErr;

    // da segunda até hoje; a ofensiva conta os dias seguidos que terminam hoje
    const rows = [];
    let streak = 0;
    let lastActive: string | null = null;
    for (let daysAgo = weekday; daysAgo >= 0; daysAgo--) {
      if (rand() > diligence) {
        // hoje ainda não estudou: a ofensiva de ontem segue de pé
        if (daysAgo > 0) streak = 0;
        continue;
      }
      streak += 1;
      lastActive = schoolDate(daysAgo);
      const points = 20 + Math.round(rand() * 90 * diligence);
      const createdAt =
        daysAgo === 0
          ? new Date(Date.now() - (1 + Math.floor(rand() * 50)) * 60_000)
          : new Date(
              `${schoolDate(daysAgo)}T${14 + Math.floor(rand() * 6)}:00:00-03:00`
            );
      rows.push({
        student_id: user.id,
        source: "card_review",
        ref: SEED_REF,
        points,
        coins: Math.round(points / 9),
        created_at: createdAt.toISOString(),
      });
    }
    if (rows.length > 0) {
      const { error } = await admin.from("reward_events").insert(rows);
      if (error) throw error;
    }

    const { data: ledger, error: ledgerErr } = await admin
      .from("reward_events")
      .select("points, coins")
      .eq("student_id", user.id);
    if (ledgerErr) throw ledgerErr;
    const coins = Math.max(
      0,
      (ledger ?? []).reduce((s, r) => s + r.coins, 0)
    );
    const totalPoints = (ledger ?? []).reduce((s, r) => s + r.points, 0);

    const { error: progErr } = await admin.from("student_progress").upsert({
      student_id: user.id,
      coins,
      total_points: totalPoints,
      streak_current: streak,
      streak_best: Math.max(streak, Math.round(diligence * 12)),
      last_active_on: lastActive,
      streak_freezes: diligence > 0.75 ? 1 : 0,
      updated_at: new Date().toISOString(),
    });
    if (progErr) throw progErr;

    const weekPoints = rows.reduce((s, r) => s + r.points, 0);
    console.log(
      `${matricula}: ${weekPoints} pts na semana · ofensiva ${streak}`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
