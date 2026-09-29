import type { Subject } from "@/src/features/spaced-repetition/types";

/** Each subject gets one of the palette's pottery colors. */
export const SUBJECT_STYLE: Record<Subject, { color: string; soft: string; glyph: string }> = {
  math: { color: "var(--aegean)", soft: "var(--aegean-soft)", glyph: "Σ" },
  science: { color: "var(--olive)", soft: "var(--olive-soft)", glyph: "Φ" },
  language: { color: "var(--terracotta)", soft: "var(--terracotta-soft)", glyph: "Λ" },
  history: { color: "var(--gold-deep)", soft: "var(--gold-soft)", glyph: "Χ" },
};
