"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  AnswerResult,
  Letter,
  ServedQuestion,
} from "@/src/features/questions/types";
import {
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  CoinDot,
  OwlLineIcon,
} from "@/src/ui/paideia/line-icons";
import {
  ChatComposer,
  HighlightLastQuestion,
  StudentLine,
  ThinkingDots,
  TutorLine,
} from "@/src/ui/student/chat/ChatParts";
import {
  AlternativeList,
  QuestionStem,
  type AlternativeState,
} from "./QuestionBody";

export interface QuestionEndpoints {
  answer: string;
  reveal: string;
  tutor: string;
}

const DEFAULT_ENDPOINTS: QuestionEndpoints = {
  answer: "/api/questions/answer",
  reveal: "/api/questions/reveal",
  tutor: "/api/questions/tutor",
};

interface ChatMsg {
  role: "student" | "assistant";
  content: string;
}

type Phase =
  | { kind: "choosing" }
  | { kind: "submitting" }
  | {
      kind: "answered";
      result: AnswerResult;
      chosen: Letter;
      key: Letter | null;
    };

type Outcome = "right" | "wrong" | null;

/**
 * Sessão de questões (prancha `TelaQuestao` + `QuestaoAcerto/Erro`).
 *
 * Diferente da Revisão de propósito: sem moldura de card, sem pilha, sem
 * flip — enunciado de prova é longo e tem figura, então ele ocupa a largura.
 * Tocar seleciona e "Confirmar" responde (com rolagem longa, toque acidental
 * é comum).
 *
 * No erro a resposta certa NÃO aparece: a coruja abre a conversa sozinha
 * perguntando por que o aluno escolheu aquela alternativa. O gabarito só
 * sai pelo "Ver resposta" (CLAUDE.md: guiar, nunca entregar).
 */
export function QuestionSession({
  questions,
  title,
  backHref,
  firstName,
  endpoints = DEFAULT_ENDPOINTS,
}: {
  questions: ServedQuestion[];
  title: string;
  backHref: string;
  firstName: string;
  endpoints?: QuestionEndpoints;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: "choosing" });
  const [selected, setSelected] = useState<Letter | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>(() =>
    questions.map(() => null)
  );
  const [totals, setTotals] = useState({ correct: 0, points: 0, coins: 0 });
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"closed" | "open" | "minimized">("closed");
  const startedAt = useRef(0);

  const question = questions[index];

  useEffect(() => {
    startedAt.current = Date.now();
    window.scrollTo({ top: 0 });
  }, [index]);

  if (questions.length === 0) {
    return <EmptySession backHref={backHref} />;
  }
  if (!question) {
    return (
      <SessionSummary
        totals={totals}
        count={questions.length}
        backHref={backHref}
      />
    );
  }

  async function confirm() {
    if (!selected || phase.kind !== "choosing") return;
    setPhase({ kind: "submitting" });
    setError(null);
    try {
      const res = await fetch(endpoints.answer, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          letter: selected,
          durationMs: Date.now() - startedAt.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Algo deu errado.");
      const result = data as AnswerResult;
      setPhase({
        kind: "answered",
        result,
        chosen: selected,
        key: result.correct_letter,
      });
      setOutcomes((o) =>
        o.map((v, i) =>
          i === index ? (result.correct ? "right" : "wrong") : v
        )
      );
      setTotals((t) => ({
        correct: t.correct + (result.correct ? 1 : 0),
        points: t.points + result.points,
        coins: t.coins + result.coins,
      }));
      if (!result.correct) setSheet("open");
    } catch (e) {
      setPhase({ kind: "choosing" });
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    }
  }

  function next() {
    setSheet("closed");
    setSelected(null);
    setPhase({ kind: "choosing" });
    setError(null);
    setIndex((i) => i + 1);
  }

  const answered = phase.kind === "answered" ? phase : null;

  function stateOf(letter: Letter): AlternativeState {
    if (!answered) return letter === selected ? "selected" : "idle";
    if (answered.key === letter) return "right";
    if (answered.chosen === letter)
      return answered.result.correct ? "right" : "wrong";
    return "muted";
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={backHref}
            aria-label="Voltar para Questões"
            className="-ml-3 grid h-11 w-11 shrink-0 place-items-center text-muted hover:text-ink"
          >
            <ChevronLeftIcon size={22} />
          </Link>
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-muted">
            {title}
          </p>
          <p className="shrink-0 text-[13px] font-extrabold tabular-nums">
            {index + 1}/{questions.length}
          </p>
        </div>
        <ol className="flex gap-[3px]" aria-label="Progresso da sessão">
          {outcomes.map((o, i) => (
            <li
              key={i}
              aria-label={
                o === "right"
                  ? "acertou"
                  : o === "wrong"
                    ? "errou"
                    : i === index
                      ? "atual"
                      : "a fazer"
              }
              className={`h-1 flex-1 rounded-full ${
                o === "right"
                  ? "bg-glauco-mid"
                  : o === "wrong"
                    ? "bg-coral-mid"
                    : i === index
                      ? "bg-night"
                      : "bg-line-strong"
              }`}
            />
          ))}
        </ol>
      </header>

      <article key={question.id} className="flex flex-col gap-5 animate-rise">
        <QuestionStem blocks={question.stem} />

        <AlternativeList
          alternatives={question.alternatives}
          stateOf={stateOf}
          onSelect={setSelected}
          disabled={phase.kind !== "choosing"}
        />

        <p className="text-[12px] leading-snug text-faint">
          {question.exam_label} · Questão {question.item_number}
          {question.source.attribution
            ? ` · ${question.source.attribution}`
            : ""}
        </p>
      </article>

      {error && <p className="text-sm font-medium text-coral-ink">{error}</p>}

      {!answered ? (
        <button
          type="button"
          onClick={confirm}
          disabled={!selected || phase.kind === "submitting"}
          className="min-h-12 rounded-[var(--radius)] bg-night text-[15px] font-extrabold text-on-night disabled:opacity-40"
        >
          {phase.kind === "submitting" ? "Conferindo…" : "Confirmar"}
        </button>
      ) : (
        <Verdict
          result={answered.result}
          chosen={answered.chosen}
          onAsk={() => setSheet("open")}
          onNext={next}
          last={index === questions.length - 1}
          sheetUsed={sheet !== "closed"}
        />
      )}

      {answered && sheet !== "closed" && (
        <TutorSheet
          key={answered.result.attempt_id}
          attemptId={answered.result.attempt_id}
          correct={answered.result.correct}
          chosen={answered.chosen}
          revealedKey={answered.key}
          firstName={firstName}
          endpoints={endpoints}
          minimized={sheet === "minimized"}
          onMinimize={() => setSheet("minimized")}
          onExpand={() => setSheet("open")}
          onRevealed={(key) =>
            setPhase((p) => (p.kind === "answered" ? { ...p, key } : p))
          }
          onNext={next}
          last={index === questions.length - 1}
        />
      )}
    </div>
  );
}

function Verdict({
  result,
  chosen,
  onAsk,
  onNext,
  last,
  sheetUsed,
}: {
  result: AnswerResult;
  chosen: Letter;
  onAsk: () => void;
  onNext: () => void;
  last: boolean;
  sheetUsed: boolean;
}) {
  const good = result.correct;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full ${
            good ? "bg-glauco text-on-glauco" : "bg-coral text-on-coral"
          }`}
        >
          {good ? (
            <CheckIcon size={18} strokeWidth={2.4} />
          ) : (
            <CloseIcon size={16} strokeWidth={2.6} />
          )}
        </span>
        <span
          className={`text-[15px] font-extrabold ${good ? "text-glauco-ink" : "text-coral-ink"}`}
        >
          {good ? `Correto: ${chosen}` : `Ainda não. Você marcou ${chosen}.`}
        </span>
        {(result.points > 0 || result.coins > 0) && (
          <span className="ml-auto flex items-center gap-2 text-sm font-extrabold tabular-nums animate-coin-pop">
            <span className="text-lavender-ink">+{result.points} pts</span>
            {result.coins > 0 && (
              <span className="flex items-center gap-1 text-lamp-ink">
                +{result.coins} <CoinDot size={14} />
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAsk}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border-[1.5px] border-input text-[14.5px] font-extrabold"
        >
          <OwlLineIcon size={19} />
          {good
            ? "Ir além com a coruja"
            : sheetUsed
              ? "Voltar à conversa"
              : "Conversar com a coruja"}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="min-h-12 flex-1 rounded-[var(--radius)] bg-night text-[15px] font-extrabold text-on-night"
        >
          {last ? "Ver resultado" : "Próxima"}
        </button>
      </div>
    </div>
  );
}

/**
 * Sheet da coruja (prancha `QuestaoErro` / `QuestaoAcerto`), mas com chat
 * completo em vez de uma resposta só. Minimiza para o aluno reler a questão
 * sem perder a conversa.
 */
function TutorSheet({
  attemptId,
  correct,
  chosen,
  revealedKey,
  firstName,
  endpoints,
  minimized,
  onMinimize,
  onExpand,
  onRevealed,
  onNext,
  last,
}: {
  attemptId: string;
  correct: boolean;
  chosen: Letter;
  revealedKey: Letter | null;
  firstName: string;
  endpoints: QuestionEndpoints;
  minimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  onRevealed: (key: Letter) => void;
  onNext: () => void;
  last: boolean;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<{
    points?: number;
    coins?: number;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, minimized]);

  async function call(body: Record<string, unknown>) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(endpoints.tutor, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Algo deu errado.");
      setConversationId(data.conversationId);
      if (data.reply)
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.reward?.awarded) setReward(data.reward);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setSending(false);
    }
  }

  // A coruja abre a conversa sozinha: o aluno não precisa digitar nada.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void Promise.resolve().then(() => call({}));
    // Só na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "student", content: text }]);
    void call({ conversationId, message: text });
  }

  async function reveal() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(endpoints.reveal, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Algo deu errado.");
      onRevealed(data.correct_letter as Letter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
      setSending(false);
      return;
    }
    await call({ conversationId, event: "revealed" });
  }

  if (minimized) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 mx-auto flex w-full max-w-xl items-center gap-2.5 border-t border-line-strong bg-surface px-5 py-3 text-left shadow-[0_-6px_20px_rgba(28,42,74,0.12)]"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-panel text-glauco">
          <OwlLineIcon size={17} strokeWidth={1.9} />
        </span>
        <span className="flex-1 text-[14px] font-bold">
          Voltar à conversa com a coruja
        </span>
        <span className="text-[13px] font-bold text-glauco-deep">Abrir</span>
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[50] bg-[rgba(21,27,46,.42)]"
        onClick={onMinimize}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={correct ? "Pergunta extra da coruja" : "Tutoria socrática"}
        className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[82dvh] w-full max-w-xl flex-col rounded-t-[18px] bg-bg pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(28,42,74,0.2)] animate-rise"
      >
        <div className="flex items-start gap-3 border-b border-line px-5 pb-3 pt-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={`text-[15px] font-extrabold ${correct ? "text-glauco-ink" : "text-coral-ink"}`}
            >
              {correct
                ? `Correto: ${chosen}`
                : revealedKey
                  ? `Você marcou ${chosen}. A correta é ${revealedKey}.`
                  : `Ainda não. Você marcou ${chosen}.`}
            </span>
            <span className="text-[13px] text-muted">
              {correct
                ? "A coruja quer ir um passo além."
                : revealedKey
                  ? "Agora vamos entender o porquê."
                  : "Vamos pensar juntos antes de ver a resposta."}
            </span>
          </div>
          <button
            type="button"
            onClick={onMinimize}
            className="-mr-2 shrink-0 rounded-sm px-2 py-2 text-[13px] font-bold text-glauco-deep"
          >
            Ver questão
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ol className="flex flex-col gap-[18px]">
            {messages.map((m, i) =>
              m.role === "student" ? (
                <StudentLine key={i} name={firstName || "Você"}>
                  {m.content}
                </StudentLine>
              ) : (
                <TutorLine
                  key={i}
                  label={
                    correct ? "A coruja quer ir além" : "Pergunta da coruja"
                  }
                >
                  <HighlightLastQuestion text={m.content} />
                </TutorLine>
              )
            )}
            {sending && (
              <TutorLine label="Coruja">
                <ThinkingDots />
              </TutorLine>
            )}
            {reward && (
              <li className="flex items-center gap-2 border-t border-dashed border-input pt-3 text-[13px] text-muted animate-coin-pop">
                <CoinDot size={14} />+{reward.points} pts e +{reward.coins}{" "}
                dracmas por estudar conversando.
              </li>
            )}
          </ol>
          {error && (
            <p className="mt-3 text-sm font-medium text-coral-ink">{error}</p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex flex-col gap-2 border-t border-line px-5 pb-4 pt-1">
          <ChatComposer
            id="resposta-coruja"
            value={input}
            onChange={setInput}
            onSubmit={send}
            disabled={sending}
            placeholder="Sua resposta"
          />
          <div className="flex gap-2">
            {!correct && !revealedKey && (
              <button
                type="button"
                onClick={reveal}
                disabled={sending}
                className="min-h-11 flex-1 rounded-[var(--radius)] text-[14px] font-bold text-muted ring-1 ring-line-strong disabled:opacity-50"
              >
                Ver resposta
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="min-h-11 flex-1 rounded-[var(--radius)] text-[14px] font-extrabold text-ink ring-1 ring-line-strong"
            >
              {last ? "Ver resultado" : "Próxima questão"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SessionSummary({
  totals,
  count,
  backHref,
}: {
  totals: { correct: number; points: number; coins: number };
  count: number;
  backHref: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center animate-rise">
      <p className="font-display text-[44px] leading-none">
        {totals.correct}
        <span className="text-[24px] text-muted"> de {count}</span>
      </p>
      <h1 className="text-[24px]">
        {totals.correct === count
          ? "Gabaritou!"
          : totals.correct >= count / 2
            ? "Bom treino."
            : "Treino é isso: errar aqui para acertar na prova."}
      </h1>
      {(totals.points > 0 || totals.coins > 0) && (
        <p className="flex items-center gap-2 text-sm font-extrabold">
          <span className="text-lavender-ink">+{totals.points} pts</span>
          {totals.coins > 0 && (
            <span className="flex items-center gap-1 text-lamp-ink">
              +{totals.coins} <CoinDot size={14} />
            </span>
          )}
        </p>
      )}
      <Link
        href={backHref}
        className="mt-2 grid min-h-12 w-full place-items-center rounded-[var(--radius)] bg-night text-[15px] font-extrabold text-on-night"
      >
        Voltar para Questões
      </Link>
    </div>
  );
}

function EmptySession({ backHref }: { backHref: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <h1 className="text-[24px]">Nada por aqui ainda</h1>
      <p className="text-sm text-muted">
        Ainda não há questões liberadas deste conteúdo para a sua série.
      </p>
      <Link
        href={backHref}
        className="mt-2 text-[14px] font-bold text-glauco-deep"
      >
        Voltar para Questões
      </Link>
    </div>
  );
}
