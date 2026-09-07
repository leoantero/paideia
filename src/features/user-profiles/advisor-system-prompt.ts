import "server-only";
import type { SubjectMastery } from "@/src/features/user-profiles/parent-profile-service";
import type { WeakPrerequisite } from "@/src/features/learning-graph/types";

const SUBJECT_LABELS: Record<string, string> = {
  math: "Matemática",
  science: "Ciências",
  language: "Português",
  history: "História",
  physics: "Física",
  biology: "Biologia",
  chemistry: "Química",
  general: "Geral",
};

const subjectLabel = (subject: string) =>
  SUBJECT_LABELS[subject] ?? subject.charAt(0).toUpperCase() + subject.slice(1);

/**
 * Monta o system prompt do "Conselheiro" — o assistente do responsável.
 * Diferente do tutor socrático: aqui a IA PODE aconselhar diretamente, porque
 * quem está aprendendo é o adulto, não a criança na hora da prova.
 *
 * O contexto injetado é só o agregado (`concept_mastery`, pré-requisitos
 * fracos) — nunca mensagens/eventos crus do filho. Essa fronteira é reforçada
 * pela RLS (`learning_events_select_self`, migration 0008), não só aqui: o
 * cliente Supabase usado pra montar esse contexto simplesmente não teria como
 * ler learning_events do filho mesmo se este código tentasse.
 */
export function buildAdvisorSystemPrompt(
  childFirstName: string,
  masteryBySubject: SubjectMastery[],
  weakPrerequisites: WeakPrerequisite[]
): string {
  const subjectLines =
    masteryBySubject.length === 0
      ? "Ainda não há sessões registradas."
      : masteryBySubject
          .map(
            (s) =>
              `- ${subjectLabel(s.subject)}: ${s.masteryPct}% de domínio (${s.sessionCount} sessões${s.fewData ? ", poucos dados ainda" : ""})`
          )
          .join("\n");

  const weakLines =
    weakPrerequisites.length === 0
      ? "Nenhum pré-requisito crítico identificado ainda."
      : weakPrerequisites
          .slice(0, 5)
          .map(
            (w) =>
              `- ${w.concept_name} (domínio ${Math.round(w.mastery * 100)}%)`
          )
          .join("\n");

  return `Você é o "Conselheiro" do Paideia, um assistente que ajuda responsáveis a apoiar o estudo de ${childFirstName} em casa. Responda sempre em português do Brasil.

Diferente do tutor do aluno, você conversa com um adulto: pode aconselhar diretamente, sugerir estratégias práticas e explicar o que os dados significam. Você NUNCA viu as conversas de ${childFirstName} com o tutor nem os eventos de aprendizagem individuais — só o resumo abaixo, que é tudo que existe disponível para você.

DOMÍNIO POR MATÉRIA (${childFirstName}):
${subjectLines}

PRÉ-REQUISITOS QUE MAIS EXPLICAM DIFICULDADE ATUAL:
${weakLines}

REGRAS:
1. Baseie os conselhos nos dados acima — não invente números nem eventos específicos que você não tem.
2. Dê sugestões concretas e acionáveis para o responsável fazer em casa (não é preciso ser professor).
3. Se os dados forem escassos, diga isso com transparência em vez de fingir certeza.
4. Seja acolhedor e breve — respostas de 2 a 4 frases, não um ensaio.
5. Nunca revele conteúdo de conversas do aluno com o tutor, porque você não tem acesso a elas.`;
}
