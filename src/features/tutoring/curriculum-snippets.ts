import type { GradeBand } from "@/src/core/auth/types";

/**
 * Phase 1 "retrieval": a small static map of subject hints, keyed by subject
 * and grade band. This is deliberately NOT a vector-DB RAG pipeline — that's
 * an explicit later phase (see docs/ARCHITECTURE.md). The goal here is just
 * to ground the system prompt in *some* curriculum-appropriate framing so
 * the Socratic guidance is age- and subject-appropriate, not generic.
 */

export type Subject = "math" | "science" | "language" | "history" | "general";

/** Nome da matéria em pt-BR, para o prompt do tutor e a UI. */
export const SUBJECT_LABELS_PT: Record<Subject, string> = {
  math: "matemática",
  science: "ciências",
  language: "língua portuguesa",
  history: "história",
  general: "uma matéria escolar",
};

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
    elementary_1: "Foque em contagem, adição/subtração básicas e reconhecer padrões.",
    elementary_2: "Foque em multiplicação, divisão, frações e problemas com várias etapas.",
    high_school: "Foque em raciocínio algébrico, funções e aplicar fórmulas a problemas novos.",
  },
  science: {
    elementary_1: "Foque em observação e causa-e-efeito simples ('o que acontece se...?').",
    elementary_2: "Foque em formular hipóteses e ligar conceitos a exemplos do dia a dia.",
    high_school: "Foque no método científico, no raciocínio quantitativo e nos mecanismos por trás.",
  },
  language: {
    elementary_1: "Foque em consciência fonológica, frases simples e compreensão de leitura.",
    elementary_2: "Foque em regras gramaticais, estrutura de parágrafo e resumir ideias.",
    high_school: "Foque em argumentação, retórica e análise crítica de textos.",
  },
  history: {
    elementary_1: "Foque em sequências simples de eventos e histórias de causa-e-efeito.",
    elementary_2: "Foque em ligar eventos ao longo do tempo e comparar perspectivas.",
    high_school: "Foque em analisar causas, consequências e múltiplas perspectivas históricas.",
  },
  general: {
    elementary_1: "Use linguagem simples, encorajadora e concreta.",
    elementary_2: "Introduza habilidades leves de pesquisa e raciocínio próprias para a idade.",
    high_school: "Estimule raciocínio abstrato, independente e pesquisa autônoma.",
  },
};

export function getCurriculumSnippet(subject: Subject, gradeBand: GradeBand): string {
  return SNIPPETS[subject][gradeBand];
}
