/**
 * Dados de gamificação — PLACEHOLDER.
 *
 * A economia real (ledger de moedas, ofensiva por dia, catálogo/resgates) é
 * back-end da fase 7. Até lá a barra e a loja renderizam com estes valores
 * ilustrativos. Ver docs/figma redesign.
 */

export interface GamificationState {
  /** Segunda a domingo — true = estudou naquele dia. */
  week: boolean[];
  /** Índice do dia de hoje (0 = segunda). */
  todayIndex: number;
  coins: number;
  weekBonus: number;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  icon: string;
  available: boolean;
}

export const PLACEHOLDER_GAMIFICATION: GamificationState = {
  week: [true, true, true, true, false, false, false],
  todayIndex: 3,
  coins: 45,
  weekBonus: 20,
};

export const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Recompensas cosméticas. Nomes genéricos — sem marcas de terceiros. */
export const REWARDS: Reward[] = [
  { id: "tema-roxo", name: "Tema roxo", cost: 20, icon: "🟣", available: true },
  { id: "sticker", name: "Sticker exclusivo", cost: 15, icon: "⭐", available: true },
  { id: "avatar", name: "Novo avatar", cost: 30, icon: "🙂", available: true },
  { id: "moldura", name: "Moldura dourada", cost: 50, icon: "✨", available: false },
];
