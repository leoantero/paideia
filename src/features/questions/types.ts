/** Espelha public_questions / RPCs de 0026_questions_and_simulations.sql. */

export type QuestionArea = "matematica" | "natureza" | "linguagens" | "humanas";

export const QUESTION_AREAS: QuestionArea[] = [
  "matematica",
  "natureza",
  "linguagens",
  "humanas",
];

export const AREA_LABELS: Record<QuestionArea, string> = {
  matematica: "Matemática",
  natureza: "Natureza",
  linguagens: "Linguagens",
  humanas: "Humanas",
};

export const AREA_GLYPHS: Record<QuestionArea, string> = {
  matematica: "Σ",
  natureza: "Φ",
  linguagens: "Λ",
  humanas: "Χ",
};

export type QuestionOrigin = "enem" | "saeb" | "obmep" | "obmep_mirim";

export type Letter = "A" | "B" | "C" | "D" | "E";

export const LETTERS: Letter[] = ["A", "B", "C", "D", "E"];

/** Imagens ficam no bucket público `question-media`; `path` é relativo a ele. */
export interface QuestionImage {
  path: string;
  alt: string;
  width: number;
  height: number;
}

export type StemBlock =
  { type: "text"; text: string } | ({ type: "image" } & QuestionImage);

export interface Alternative {
  letter: Letter;
  text?: string;
  image?: QuestionImage;
}

export interface QuestionSource {
  url?: string;
  license?: string;
  attribution?: string;
}

/** O que get_question_set() devolve: nunca inclui o gabarito. */
export interface ServedQuestion {
  id: string;
  origin: QuestionOrigin;
  exam_label: string;
  exam_year: number;
  item_number: number;
  area: QuestionArea;
  subject: string;
  concept_id: string;
  concept_name: string;
  stem: StemBlock[];
  alternatives: Alternative[];
  source: QuestionSource;
  answered_before: boolean;
}

export interface AnswerResult {
  attempt_id: string;
  question_id: string;
  origin: QuestionOrigin;
  correct: boolean;
  /** Só vem preenchido no acerto. No erro, o tutor conversa antes. */
  correct_letter: Letter | null;
  first_attempt: boolean;
  points: number;
  coins: number;
  concept_id: string;
  difficulty: number;
}

export interface ConceptOverview {
  concept_id: string;
  code: string;
  name: string;
  subject: string;
  total: number;
  answered: number;
  accuracy: number | null;
}

export interface QuestionOverview {
  area: QuestionArea;
  areas: Array<{ area: QuestionArea; total: number }>;
  total: number;
  answered: number;
  concepts: ConceptOverview[];
}

/** question_tutor_context(): só do servidor, inclui o gabarito. */
export interface QuestionTutorContext {
  attempt_id: string;
  chosen_letter: Letter;
  correct: boolean;
  revealed: boolean;
  question: {
    id: string;
    exam_label: string;
    item_number: number;
    subject: string;
    concept_name: string | null;
    stem: StemBlock[];
    alternatives: Alternative[];
    correct_letter: Letter;
  };
}

/** Abaixo disto o conteúdo aparece como "vale rever" (barra coral). */
export const WEAK_ACCURACY = 50;
