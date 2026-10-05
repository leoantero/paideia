import type { Subject } from "@/src/features/spaced-repetition/types";

export interface SubjectStyle {
  color: string;
  soft: string;
  glyph: string;
}

/** Each subject gets one of the palette's pottery colors and a Greek letter. */
export const SUBJECT_STYLE: Record<Subject, SubjectStyle> = {
  math: { color: "var(--aegean)", soft: "var(--aegean-soft)", glyph: "Σ" },
  science: { color: "var(--olive)", soft: "var(--olive-soft)", glyph: "Φ" },
  language: {
    color: "var(--terracotta)",
    soft: "var(--terracotta-soft)",
    glyph: "Λ",
  },
  history: { color: "var(--gold-deep)", soft: "var(--gold-soft)", glyph: "Χ" },
  physics: {
    color: "var(--aegean-deep)",
    soft: "var(--aegean-soft)",
    glyph: "Ψ",
  },
  biology: { color: "var(--olive)", soft: "var(--olive-soft)", glyph: "Β" },
  chemistry: {
    color: "var(--terracotta-deep)",
    soft: "var(--terracotta-soft)",
    glyph: "Ω",
  },
};

const FALLBACK: SubjectStyle = {
  color: "var(--ink-soft)",
  soft: "var(--marble-deep)",
  glyph: "Π",
};

export const subjectStyle = (subject: string): SubjectStyle =>
  SUBJECT_STYLE[subject as Subject] ?? FALLBACK;
