/**
 * Cor, fundo e glifo de cada matéria nos apps de professor e gestor. Deriva
 * da mesma tabela do aluno (src/ui/student/subject-style.ts), então os quatro
 * perfis falam a mesma língua visual: um matiz Glaukópis e uma letra grega.
 */
import { subjectStyle } from "@/src/ui/student/subject-style";

export interface SubjectStyle {
  label: string;
  /** texto/realce da matéria */
  color: string;
  /** fundo sutil */
  bg: string;
  /** barra de domínio */
  bar: string;
  /** letra grega; renderize com `font-mark` */
  icon: string;
}

const LABELS: Record<string, string> = {
  math: "Matemática",
  science: "Ciências",
  language: "Português",
  physics: "Física",
  history: "História",
  biology: "Biologia",
  chemistry: "Química",
};

export const styleFor = (subject: string): SubjectStyle => {
  const s = subjectStyle(subject);
  return {
    label: LABELS[subject] ?? (subject || "Geral"),
    color: s.color,
    bg: s.soft,
    bar: s.bar,
    icon: s.glyph,
  };
};
