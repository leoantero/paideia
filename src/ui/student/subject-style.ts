import type { Subject } from "@/src/features/spaced-repetition/types";

export interface SubjectStyle {
  /** texto colorido da matéria (rótulo, glifo) sobre fundo ou cartão */
  color: string;
  /** fundo sutil */
  soft: string;
  /** fundo pastel do ícone da matéria */
  tile: string;
  /** texto sobre `tile` */
  onTile: string;
  /** segmento "dominado" da barra de progresso */
  bar: string;
  /** segmento "visto" da barra de progresso */
  barSoft: string;
  glyph: string;
}

const lavender = {
  color: "var(--p-lavender-ink)",
  soft: "var(--p-lavender-soft)",
  tile: "var(--p-lavender)",
  onTile: "var(--p-lavender-ink)",
  bar: "var(--p-lavender-deep)",
  barSoft: "var(--p-lavender)",
};
const glauco = {
  color: "var(--p-glauco-ink)",
  soft: "var(--p-glauco-soft)",
  tile: "var(--p-glauco)",
  onTile: "var(--p-on-glauco)",
  bar: "var(--p-glauco-mid)",
  barSoft: "var(--p-glauco)",
};
const lamp = {
  color: "var(--p-lamp-ink)",
  soft: "var(--p-lamp-soft)",
  tile: "var(--p-lamp)",
  onTile: "var(--p-on-lamp-accent)",
  bar: "var(--p-coin)",
  barSoft: "var(--p-lamp)",
};
const coral = {
  color: "var(--p-coral-ink)",
  soft: "var(--p-coral-soft)",
  tile: "var(--p-coral)",
  onTile: "var(--p-on-coral)",
  bar: "var(--p-coral-mid)",
  barSoft: "var(--p-coral)",
};

/** Cada matéria ganha um matiz da paleta Glaukópis e uma letra grega. */
export const SUBJECT_STYLE: Record<Subject, SubjectStyle> = {
  math: { ...lavender, glyph: "Σ" },
  science: { ...glauco, glyph: "Φ" },
  language: { ...coral, glyph: "Λ" },
  history: { ...lamp, glyph: "Χ" },
  physics: { ...lavender, glyph: "Ψ" },
  biology: { ...glauco, glyph: "Β" },
  chemistry: { ...coral, glyph: "Ω" },
};

const FALLBACK: SubjectStyle = {
  color: "var(--p-muted)",
  soft: "var(--p-line)",
  tile: "var(--p-line)",
  onTile: "var(--p-muted)",
  bar: "var(--p-muted)",
  barSoft: "var(--p-line-strong)",
  glyph: "Π",
};

export const subjectStyle = (subject: string): SubjectStyle =>
  SUBJECT_STYLE[subject as Subject] ?? FALLBACK;
