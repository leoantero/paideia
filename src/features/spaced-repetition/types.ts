/** Shapes returned by the spaced-repetition RPCs in supabase/migrations/0009_spaced_repetition.sql. */

export type CardKind = "multiple_choice" | "short_answer" | "open";
export type ReviewGrade = "again" | "hard" | "good" | "easy";
export type Subject = "math" | "science" | "language" | "history";

export interface StudyCard {
  id: string;
  deck_id: string;
  deck_title: string;
  subject: Subject;
  kind: CardKind;
  prompt: string;
  choices: string[] | null;
  is_new: boolean;
}

export interface ReviewResult {
  card_id: string;
  grade: ReviewGrade;
  correct: boolean;
  answer: string;
  correct_choice: number | null;
  interval_days: number;
  next_due_on: string;
  points: number;
  coins: number;
  daily_goal_completed: boolean;
}

export interface DeckOverview {
  id: string;
  title: string;
  subject: Subject;
  description: string;
  total_cards: number;
  seen_cards: number;
  due_cards: number;
  mastered_cards: number;
}

export const SUBJECT_LABELS: Record<Subject, string> = {
  math: "Matemática",
  science: "Ciências",
  language: "Português",
  history: "História",
};
