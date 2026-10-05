/** Shapes returned by the spaced-repetition RPCs in supabase/migrations/0021_spaced_repetition.sql. */

export type CardKind =
  "multiple_choice" | "short_answer" | "open" | "flashcard";
export type ReviewGrade = "again" | "hard" | "good" | "easy";
export type Subject =
  | "math"
  | "science"
  | "language"
  | "history"
  | "physics"
  | "biology"
  | "chemistry";

export interface StudyCard {
  id: string;
  deck_id: string;
  deck_title: string;
  subject: Subject;
  kind: CardKind;
  prompt: string;
  choices: string[] | null;
  /** Flashcards only: the back, shown before the student grades themself. */
  back: string | null;
  is_new: boolean;
}

export interface ReviewResult {
  card_id: string;
  /** Anchor in the learning graph; null = the review produces no evidence. */
  concept_id: string | null;
  /** The concept's intrinsic difficulty (0..1), for the evidence; null without a concept. */
  concept_difficulty: number | null;
  /** First review of this card today — only that one counts as evidence and points. */
  first_today: boolean;
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
  physics: "Física",
  biology: "Biologia",
  chemistry: "Química",
};

/** Subjects that may come from the DB without being in the union above. */
export const subjectLabel = (subject: string): string =>
  SUBJECT_LABELS[subject as Subject] ?? subject;
