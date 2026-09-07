import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GamificationState } from "@/src/ui/student/gamification-data";

/**
 * Ofensiva e moedas DERIVADAS da atividade real do aluno.
 *
 * Antes disto a barra mostrava um objeto fixo no cliente — todo aluno via
 * "4 dias seguidos · 45 moedas", inclusive quem nunca tinha estudado. Número
 * inventado numa tela que o responsável também vê é exatamente o tipo de coisa
 * que destrói a confiança no resto dos dados.
 *
 * NÃO é um ledger. Não existe (ainda) tabela de moedas: o valor é uma função
 * pura e determinística do histórico de `learning_events`, recalculada a cada
 * render. Quando a economia real entrar (coin_ledger, resgates), isto vira a
 * migração inicial de saldo — e não um número que precisa ser reconciliado.
 *
 * Regras (docs/REDESIGN_PLAN.md #9/#10):
 *   dia de ofensiva = qualquer dia com pelo menos uma evidência registrada
 *   +5 por dia de ofensiva · +2 por card de revisão (teto 20/dia) · +20 por semana completa
 */

const COINS_PER_ACTIVE_DAY = 5;
const COINS_PER_REVIEW = 2;
const REVIEW_COINS_DAILY_CAP = 20;
const FULL_WEEK_BONUS = 20;

/** Segunda = 0 … domingo = 6 (o app é pt-BR e a semana começa na segunda). */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export interface ActivityEvent {
  source: string;
  occurred_at: string;
}

export async function getGamificationState(
  supabase: SupabaseClient,
  studentId: string
): Promise<GamificationState> {
  // RLS: `learning_events_select_self` — o aluno só enxerga a própria evidência.
  const { data } = await supabase
    .from("learning_events")
    .select("source, occurred_at")
    .eq("student_id", studentId)
    .order("occurred_at", { ascending: false })
    .limit(2000);

  return deriveGamification((data ?? []) as ActivityEvent[]);
}

/**
 * A regra de ofensiva/moedas, pura e sem I/O — mesma separação de bkt.ts.
 * É o que permite testar a economia sem banco (activity.test.ts).
 */
export function deriveGamification(
  events: ActivityEvent[],
  today = new Date()
): GamificationState {
  // ── dias ativos e cards de revisão por dia ──
  const reviewsByDay = new Map<string, number>();
  const activeDays = new Set<string>();
  for (const e of events) {
    const key = dayKey(e.occurred_at as string);
    activeDays.add(key);
    if (e.source === "retrieval_review") {
      reviewsByDay.set(key, (reviewsByDay.get(key) ?? 0) + 1);
    }
  }

  // ── semana corrente (segunda a domingo) ──
  const todayIndex = mondayIndex(today);
  const monday = new Date(today);
  monday.setDate(today.getDate() - todayIndex);

  const week: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(activeDays.has(d.toISOString().slice(0, 10)));
  }

  // ── moedas ──
  let coins = activeDays.size * COINS_PER_ACTIVE_DAY;
  for (const count of reviewsByDay.values()) {
    coins += Math.min(count * COINS_PER_REVIEW, REVIEW_COINS_DAILY_CAP);
  }
  coins += countFullWeeks(activeDays) * FULL_WEEK_BONUS;

  return {
    week,
    todayIndex,
    coins,
    weekBonus: FULL_WEEK_BONUS,
    streak: currentStreak(activeDays, today),
  };
}

/**
 * Ofensiva de verdade: dias CONSECUTIVOS até hoje (ou até ontem, se o aluno
 * ainda não estudou hoje — a ofensiva só quebra quando o dia passa em branco).
 *
 * A barra antes mostrava "N dias seguidos" usando o número de dias ativos da
 * semana, que não é a mesma coisa: estudar segunda e sexta não é ofensiva de 2.
 */
function currentStreak(activeDays: Set<string>, today: Date): number {
  const cursor = new Date(today);
  const key = (d: Date) => d.toISOString().slice(0, 10);

  // se hoje ainda não teve atividade, a contagem começa em ontem
  if (!activeDays.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (activeDays.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Semanas (seg–dom) em que o aluno esteve ativo nos 7 dias. */
function countFullWeeks(activeDays: Set<string>): number {
  const byWeek = new Map<string, Set<string>>();
  for (const key of activeDays) {
    const d = new Date(`${key}T00:00:00Z`);
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const wk = monday.toISOString().slice(0, 10);
    if (!byWeek.has(wk)) byWeek.set(wk, new Set());
    byWeek.get(wk)!.add(key);
  }
  let full = 0;
  for (const days of byWeek.values()) if (days.size >= 7) full += 1;
  return full;
}
