import type { GradeBand } from "@/src/core/auth/types";
import type { TutorMessage } from "@/src/core/ai-integration/anthropic-client";
import type { Subject } from "@/src/features/tutoring/curriculum-snippets";
import { buildSocraticSystemPrompt } from "@/src/features/tutoring/socratic-system-prompt";
import type {
  QuestionTutorContext,
  StemBlock,
} from "@/src/features/questions/types";

/**
 * Prompt do tutor quando a conversa nasce de uma questão respondida.
 *
 * Herda as regras duras de buildSocraticSystemPrompt e acrescenta a questão,
 * a escolha do aluno e o gabarito — este marcado como sigiloso enquanto o
 * aluno não pediu "Ver resposta". O tutor precisa do gabarito para guiar
 * na direção certa; a regra é o que impede de entregá-lo.
 *
 * Imagens entram como descrição textual (alt revisado na importação), não
 * como imagem: mais barato por turno e não depende do SDK.
 */

const SUBJECT_BUCKET: Record<string, Subject> = {
  math: "math",
  physics: "science",
  chemistry: "science",
  biology: "science",
  science: "science",
  language: "language",
  english: "language",
  spanish: "language",
  arts: "language",
  history: "history",
  geography: "history",
  philosophy: "history",
  sociology: "history",
};

export function tutorSubjectFor(subject: string): Subject {
  return SUBJECT_BUCKET[subject] ?? "general";
}

function renderBlocks(blocks: StemBlock[]): string {
  return blocks
    .map((b) =>
      b.type === "text" ? b.text : `[Figura: ${b.alt || "sem descrição"}]`
    )
    .join("\n\n");
}

function renderAlternatives(ctx: QuestionTutorContext): string {
  return ctx.question.alternatives
    .map((a) => {
      const body = [a.text, a.image ? `[Figura: ${a.image.alt}]` : null]
        .filter(Boolean)
        .join(" ");
      return `(${a.letter}) ${body}`;
    })
    .join("\n");
}

function modeInstructions(ctx: QuestionTutorContext): string {
  const chosen = ctx.chosen_letter;
  const key = ctx.question.correct_letter;

  if (ctx.correct) {
    return `O aluno ACERTOU (marcou ${chosen}). Parabenize em uma frase curta e vá um passo além: faça UMA pergunta que verifique se ele entende POR QUE a ${chosen} está certa, ou que estenda a ideia para um caso vizinho. Depois, tire as dúvidas que ele trouxer, sempre perguntando.`;
  }

  if (!ctx.revealed) {
    return `O aluno ERROU: marcou ${chosen}. Ele ainda NÃO viu a resposta certa.
- O gabarito é sigiloso: NÃO diga qual alternativa é a correta, NÃO elimine alternativas por ele e NÃO dê a conta pronta — nem se ele pedir. (Se ele quiser a resposta, ele tem o botão "Ver resposta" na tela.)
- Primeiro entenda o raciocínio dele: por que ${chosen} pareceu certa? O que ele pensou? Um erro tem uma lógica por trás, e é ela que você procura.
- Depois, com perguntas curtas, leve-o a perceber sozinho onde o raciocínio desviou.`;
  }

  return `O aluno errou (marcou ${chosen}) e JÁ VIU que a correta é ${key}. Agora ajude-o a entender por que ${key} está certa e onde o raciocínio dele desviou. Você pode confirmar o gabarito, mas continue guiando com perguntas: não resolva a questão inteira por ele.`;
}

export function buildQuestionTutorPrompt(
  gradeBand: GradeBand,
  ctx: QuestionTutorContext
): string {
  const base = buildSocraticSystemPrompt(
    gradeBand,
    tutorSubjectFor(ctx.question.subject)
  );
  const concept = ctx.question.concept_name
    ? `\nConteúdo: ${ctx.question.concept_name}.`
    : "";

  return `${base}

QUESTÃO QUE O ALUNO ACABOU DE RESPONDER (${ctx.question.exam_label}, questão ${ctx.question.item_number}):${concept}

${renderBlocks(ctx.question.stem)}

${renderAlternatives(ctx)}

GABARITO (sigiloso, só para você guiar): ${ctx.question.correct_letter}

COMO CONDUZIR ESTA CONVERSA:
${modeInstructions(ctx)}

Mensagens curtas: no máximo 3 frases e sempre terminando em uma pergunta. Fale de forma simples, como num chat.`;
}

/**
 * A API exige que a conversa comece com uma fala do usuário. Este turno
 * sintético dá o "evento" que abre a conversa; ele não é persistido nem
 * mostrado ao aluno, e é reposto à frente do histórico em todo turno.
 */
export function buildRevealedTurn(ctx: QuestionTutorContext): string {
  return `[Mensagem do sistema, não do aluno] O aluno tocou em "Ver resposta" e viu que a correta é ${ctx.question.correct_letter}. Continue a conversa a partir disso.`;
}

/**
 * Monta as mensagens da chamada: o turno sintético de abertura na frente do
 * histórico e, se houver, um evento no fim. Turnos seguidos do mesmo papel
 * são fundidos, porque o histórico truncado pode começar ou terminar numa
 * fala do aluno.
 */
export function withSyntheticTurns(
  opening: string,
  history: TutorMessage[],
  trailing?: string
): TutorMessage[] {
  const turns: TutorMessage[] = [
    { role: "user", content: opening },
    ...history,
    ...(trailing ? [{ role: "user" as const, content: trailing }] : []),
  ];
  return turns.reduce<TutorMessage[]>((acc, turn) => {
    const last = acc[acc.length - 1];
    if (last && last.role === turn.role) {
      acc[acc.length - 1] = {
        ...last,
        content: `${last.content}\n\n${turn.content}`,
      };
    } else {
      acc.push(turn);
    }
    return acc;
  }, []);
}

export function buildOpeningTurn(ctx: QuestionTutorContext): string {
  if (ctx.correct) {
    return `[Mensagem do sistema, não do aluno] O aluno acertou a questão marcando ${ctx.chosen_letter} e tocou em "Tirar dúvida com a coruja". Abra a conversa.`;
  }
  return `[Mensagem do sistema, não do aluno] O aluno marcou ${ctx.chosen_letter} e errou. Abra a conversa perguntando por que ele escolheu ${ctx.chosen_letter}, sem revelar a resposta.`;
}
