import type { GradeBand } from "@/src/core/auth/types";

/**
 * Phase 1 "retrieval": a small static map of subject hints, keyed by subject
 * and grade band. This is deliberately NOT a vector-DB RAG pipeline — that's
 * an explicit later phase (see docs/ARCHITECTURE.md). The goal here is just
 * to ground the system prompt in *some* curriculum-appropriate framing so
 * the Socratic guidance is age- and subject-appropriate, not generic.
 */

export type Subject = "math" | "science" | "language" | "history" | "general";

const SUBJECT_KEYWORDS: Record<Exclude<Subject, "general">, string[]> = {
  math: ["math", "matemática", "equation", "number", "multiply", "divide", "fraction", "geometry"],
  science: ["science", "ciências", "photosynthesis", "biology", "chemistry", "physics", "experiment"],
  language: ["grammar", "português", "writing", "essay", "sentence", "verb", "reading"],
  history: ["history", "história", "war", "century", "revolution", "civilization"],
};

/** Very simple keyword match — good enough to pick a reasonable subject bucket for Phase 1. */
export function detectSubject(message: string): Subject {
  const lower = message.toLowerCase();
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS) as [
    Exclude<Subject, "general">,
    string[]
  ][]) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return subject;
    }
  }
  return "general";
}

const SNIPPETS: Record<Subject, Record<GradeBand, string>> = {
  math: {
    elementary_1: "Focus on counting, basic addition/subtraction, and recognizing patterns.",
    elementary_2: "Focus on multiplication, division, fractions, and multi-step word problems.",
    high_school: "Focus on algebraic reasoning, functions, and applying formulas to novel problems.",
  },
  science: {
    elementary_1: "Focus on observation and simple cause-and-effect ('what happens if...?').",
    elementary_2: "Focus on forming hypotheses and connecting concepts to everyday examples.",
    high_school: "Focus on the scientific method, quantitative reasoning, and underlying mechanisms.",
  },
  language: {
    elementary_1: "Focus on phonics, simple sentence structure, and reading comprehension.",
    elementary_2: "Focus on grammar rules, paragraph structure, and summarizing ideas.",
    high_school: "Focus on argumentation, rhetoric, and analyzing texts critically.",
  },
  history: {
    elementary_1: "Focus on simple sequences of events and cause-and-effect stories.",
    elementary_2: "Focus on connecting events across time and comparing perspectives.",
    high_school: "Focus on analyzing causes, consequences, and multiple historical perspectives.",
  },
  general: {
    elementary_1: "Keep language simple, encouraging, and concrete.",
    elementary_2: "Introduce light research/reasoning skills appropriate for this age.",
    high_school: "Encourage independent, abstract reasoning and self-directed research.",
  },
};

export function getCurriculumSnippet(subject: Subject, gradeBand: GradeBand): string {
  return SNIPPETS[subject][gradeBand];
}
