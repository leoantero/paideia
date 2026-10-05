/**
 * Cor, fundo e ícone de cada matéria nos apps de professor e gestor (paleta
 * do Figma). O app do aluno usa a paleta grega de
 * src/ui/student/subject-style.ts.
 */

export interface SubjectStyle {
  label: string;
  color: string;
  bg: string;
  icon: string;
}

export const SUBJECT_STYLES: Record<string, SubjectStyle> = {
  math: { label: "Matemática", color: "#1e3a8a", bg: "#e8f0fb", icon: "📐" },
  language: { label: "Português", color: "#b8960a", bg: "#fdf8e1", icon: "📝" },
  physics: { label: "Física", color: "#2d7a4f", bg: "#e5f5ed", icon: "⚡" },
  history: { label: "História", color: "#8b4513", bg: "#f9ede3", icon: "📜" },
  biology: { label: "Biologia", color: "#1a7a8a", bg: "#e3f4f6", icon: "🌿" },
  chemistry: { label: "Química", color: "#6a2d7a", bg: "#f3e8fb", icon: "🧪" },
};

export const FALLBACK_STYLE: SubjectStyle = {
  label: "Geral",
  color: "#4a6080",
  bg: "#eef3f6",
  icon: "📚",
};

export const styleFor = (subject: string): SubjectStyle =>
  SUBJECT_STYLES[subject] ?? { ...FALLBACK_STYLE, label: subject };
