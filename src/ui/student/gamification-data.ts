/**
 * Tipos e catálogo da gamificação.
 *
 * O ESTADO (ofensiva, moedas) não mora mais aqui: é derivado da atividade real
 * em src/features/gamification/activity-service.ts. Este arquivo guardava um
 * PLACEHOLDER_GAMIFICATION fixo que mostrava "4 dias seguidos · 45 moedas"
 * para qualquer aluno, inclusive quem nunca tinha estudado.
 *
 * O catálogo de recompensas segue estático de propósito: é conteúdo, não
 * estado. O resgate em si (debitar moedas, aplicar cosmético) é a fase de
 * back-end da economia — por isso os botões ainda não compram nada, e a tela
 * diz isso ao aluno em vez de fingir.
 */

export interface GamificationState {
  /** Segunda a domingo — true = houve atividade registrada naquele dia. */
  week: boolean[];
  /** Índice do dia de hoje (0 = segunda). */
  todayIndex: number;
  coins: number;
  weekBonus: number;
  /** Dias CONSECUTIVOS de estudo até hoje — não é o mesmo que dias na semana. */
  streak: number;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  icon: string;
  available: boolean;
}

export const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Recompensas cosméticas. Nomes genéricos — sem marcas de terceiros. */
export const REWARDS: Reward[] = [
  {
    id: "tema-roxo",
    name: "Tema roxo",
    cost: 20,
    icon: "🟣",
    available: false,
  },
  {
    id: "sticker",
    name: "Sticker exclusivo",
    cost: 15,
    icon: "⭐",
    available: false,
  },
  { id: "avatar", name: "Novo avatar", cost: 30, icon: "🙂", available: false },
  {
    id: "moldura",
    name: "Moldura dourada",
    cost: 50,
    icon: "✨",
    available: false,
  },
];
