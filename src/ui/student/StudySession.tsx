"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  ReviewGrade,
  ReviewResult,
  StudyCard,
} from "@/src/features/spaced-repetition/types";
import { subjectLabel } from "@/src/features/spaced-repetition/types";
import {
  CheckIcon,
  CloseIcon,
  CoinDot,
  HourglassIcon,
  OwlLineIcon,
} from "@/src/ui/paideia/line-icons";
import { subjectStyle } from "./subject-style";

interface DialogTurn {
  role: "student" | "tutor";
  content: string;
}

type Phase =
  | { kind: "answering" }
  | { kind: "flipped" }
  | { kind: "submitting" }
  | {
      kind: "revealed";
      result: ReviewResult;
      chosen: number | null;
      tutorClosing: string | null;
    };

export interface StudySessionProps {
  initialQueue: StudyCard[];
  basePath?: string;
  reviewEndpoint?: string;
  openEndpoint?: string;
}

interface Totals {
  reviewed: number;
  correct: number;
  points: number;
  coins: number;
  goalCompleted: boolean;
}

const LETTERS = ["Α", "Β", "Γ", "Δ", "Ε", "Ζ"];

/** Numeral grego (αʹ, βʹ… ιʹ, ιαʹ): o número do card, como nas pranchas. */
function greekNumeral(n: number) {
  const units = ["", "α", "β", "γ", "δ", "ε", "ϛ", "ζ", "η", "θ"];
  const tens = ["", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ϟ"];
  const hundreds = ["", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω", "ϡ"];
  if (n < 1 || n > 999) return String(n);
  return (
    hundreds[Math.floor(n / 100)] +
    tens[Math.floor((n % 100) / 10)] +
    units[n % 10] +
    "ʹ"
  );
}

/** Sessão de revisão (pranchas `TelaRevisao` + `TelaResposta`). */
export function StudySession({
  initialQueue,
  basePath = "/student",
  reviewEndpoint = "/api/study/review",
  openEndpoint = "/api/study/open",
}: StudySessionProps) {
  const [queue, setQueue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: "answering" });
  const [typed, setTyped] = useState("");
  const [dialog, setDialog] = useState<DialogTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals>({
    reviewed: 0,
    correct: 0,
    points: 0,
    coins: 0,
    goalCompleted: false,
  });
  const startedAt = useRef(0);

  const card = queue[index];

  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  if (queue.length === 0) {
    return <EmptyState basePath={basePath} />;
  }
  if (!card) {
    return <SessionSummary totals={totals} basePath={basePath} />;
  }

  function applyResult(
    result: ReviewResult,
    chosen: number | null,
    tutorClosing: string | null
  ) {
    setPhase({ kind: "revealed", result, chosen, tutorClosing });
    setTotals((t) => ({
      reviewed: t.reviewed + 1,
      correct: t.correct + (result.correct ? 1 : 0),
      points: t.points + result.points,
      coins: t.coins + result.coins,
      goalCompleted: t.goalCompleted || result.daily_goal_completed,
    }));
    // Forgotten cards come back at the end of this same session, at most
    // 3 appearances; after that they stay due for the next session.
    const appearances = queue.filter((c) => c.id === card.id).length;
    if (result.interval_days === 0 && appearances < 3) {
      setQueue((q) => [...q, { ...card, is_new: false }]);
    }
  }

  async function submitObjective(
    answer: { response: string } | { grade: ReviewGrade },
    chosen: number | null,
    submittedAt: number
  ) {
    const durationMs = submittedAt - startedAt.current;
    const before = phase;
    setPhase({ kind: "submitting" });
    setError(null);
    try {
      const res = await fetch(reviewEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, ...answer, durationMs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Algo deu errado.");
      applyResult(data as ReviewResult, chosen, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
      setPhase(before.kind === "flipped" ? before : { kind: "answering" });
    }
  }

  async function submitOpen(submittedAt: number) {
    const answer = typed.trim();
    if (!answer) return;
    const durationMs = submittedAt - startedAt.current;
    setPhase({ kind: "submitting" });
    setError(null);
    setDialog((d) => [...d, { role: "student", content: answer }]);
    setTyped("");
    try {
      const res = await fetch(openEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          history: dialog,
          answer,
          durationMs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Algo deu errado.");
      if (data.final) {
        applyResult(data.result as ReviewResult, null, data.reply);
      } else {
        setDialog((d) => [...d, { role: "tutor", content: data.reply }]);
        setPhase({ kind: "answering" });
      }
    } catch (err) {
      setDialog((d) => d.slice(0, -1));
      setTyped(answer);
      setError(err instanceof Error ? err.message : "Algo deu errado.");
      setPhase({ kind: "answering" });
    }
  }

  function next() {
    setIndex((i) => i + 1);
    setPhase({ kind: "answering" });
    setTyped("");
    setDialog([]);
    setError(null);
  }

  const style = subjectStyle(card.subject);
  const revealed = phase.kind === "revealed" ? phase : null;
  const busy = phase.kind === "submitting";
  const flipped =
    phase.kind === "flipped" || (busy && card.kind === "flashcard");
  const showBack = flipped || !!revealed;
  const tutorHref = `${basePath}/tutor?q=${encodeURIComponent(
    `Não entendi este card: ${card.prompt}`
  )}`;

  const cardHeader = (
    <div className="flex items-center gap-2">
      <span className="font-mark text-lg" style={{ color: style.color }}>
        {style.glyph}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
        {subjectLabel(card.subject)} · {card.deck_title}
      </span>
      {card.is_new && !showBack ? (
        <span className="rounded-full bg-lamp-soft px-2 py-0.5 text-[11px] font-extrabold text-lamp-ink">
          novo
        </span>
      ) : (
        <span
          className="font-mark text-base text-faint"
          title={`Card número ${index + 1}`}
        >
          {greekNumeral(index + 1)}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[26px]">Revisão</h1>
          <span className="text-[13px] tabular-nums text-muted">
            Card {index + 1} de {queue.length}
          </span>
        </div>
        <div className="h-1 rounded-sm bg-line-strong" aria-hidden>
          <div
            className="h-1 rounded-sm bg-night transition-[width]"
            style={{ width: `${((index + 1) / queue.length) * 100}%` }}
          />
        </div>
      </div>

      {showBack ? (
        <CardFrame key={`${card.id}-${index}-back`} animate="flip">
          <div className="flex flex-col gap-3.5 p-[18px]">
            {cardHeader}
            <p className="text-sm leading-[1.45] text-muted">{card.prompt}</p>
            <MeanderRule />
            {revealed ? (
              <CardResult card={card} phase={revealed} />
            ) : (
              card.back && <BackText text={card.back} />
            )}
          </div>
        </CardFrame>
      ) : (
        <div className="relative pt-3">
          <div className="absolute inset-x-4 top-0 h-[60px] rounded-[10px] bg-line-strong" />
          <div className="absolute inset-x-2 top-1.5 h-[60px] rounded-[11px] bg-line" />
          <CardFrame key={`${card.id}-${index}-front`} animate="rise">
            <div
              className={`flex flex-col gap-5 px-[18px] pb-5 pt-[18px] ${
                card.kind === "flashcard" ? "min-h-[330px]" : "min-h-[180px]"
              }`}
            >
              {cardHeader}
              <p className="my-auto font-display text-2xl leading-[1.3]">
                {card.prompt}
              </p>
              <p className="text-[13px] text-muted">
                {card.kind === "flashcard"
                  ? "Responda de cabeça antes de virar o card."
                  : card.kind === "multiple_choice"
                    ? "Escolha uma alternativa."
                    : card.kind === "short_answer"
                      ? "Escreva a resposta curta."
                      : "Explique com suas palavras. O tutor vai te ajudar a chegar lá."}
              </p>
            </div>
          </CardFrame>
        </div>
      )}

      {!revealed && card.kind === "multiple_choice" && card.choices && (
        <div
          className="flex flex-col gap-2.5"
          role="group"
          aria-label="Alternativas"
        >
          {card.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() =>
                submitObjective({ response: String(i) }, i, Date.now())
              }
              className="flex min-h-14 items-center gap-3.5 rounded-[12px] border-[1.5px] border-line-strong bg-surface px-3.5 py-2 text-left text-[17px] font-bold tabular-nums hover:border-night disabled:opacity-60"
            >
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[8px] bg-line font-mark text-lg">
                {LETTERS[i]}
              </span>
              {choice}
            </button>
          ))}
        </div>
      )}

      {!revealed && card.kind === "short_answer" && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim())
              submitObjective({ response: typed }, null, Date.now());
          }}
        >
          <label htmlFor="resposta-curta" className="sr-only">
            Sua resposta
          </label>
          <input
            id="resposta-curta"
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Sua resposta"
            className="h-12 min-w-0 flex-1 rounded-sm border-[1.5px] border-input bg-surface px-3.5 text-[15px] font-semibold focus:border-night focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !typed.trim()}
            className="h-12 rounded-sm bg-night px-5 text-[15px] font-extrabold text-on-night disabled:opacity-40"
          >
            {busy ? "…" : "Verificar"}
          </button>
        </form>
      )}

      {!revealed && card.kind === "open" && (
        <OpenDialog
          dialog={dialog}
          typed={typed}
          busy={busy}
          onType={setTyped}
          onSubmit={submitOpen}
        />
      )}

      {!revealed && card.kind === "flashcard" && !flipped && (
        <>
          <PrimaryButton
            autoFocus
            onClick={() => setPhase({ kind: "flipped" })}
          >
            Mostrar resposta
          </PrimaryButton>
          <p className="text-center text-[13px] leading-normal text-muted">
            <span className="font-mark text-[15px] text-glauco-deep">
              ἀνάμνησις
            </span>{" "}
            · para Platão, aprender é relembrar.
          </p>
        </>
      )}

      {!revealed && card.kind === "flashcard" && flipped && (
        <SelfGrade
          busy={busy}
          onGrade={(grade) => submitObjective({ grade }, null, Date.now())}
        />
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-sm bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink">
          <span>{error}</span>
          <button type="button" onClick={next} className="shrink-0 underline">
            Pular card
          </button>
        </div>
      )}

      {revealed && (
        <PrimaryButton autoFocus onClick={next}>
          {index + 1 < queue.length ? "Próximo card" : "Ver resultado"}
        </PrimaryButton>
      )}

      {(flipped || revealed) && (
        <Link
          href={tutorHref}
          className="flex min-h-11 items-center gap-2 text-sm font-bold text-glauco-deep"
        >
          <OwlLineIcon size={20} strokeWidth={1.8} />
          Não entendi. Conversar com o tutor sobre este card
        </Link>
      )}
    </div>
  );
}

function CardFrame({
  children,
  animate,
}: {
  children: ReactNode;
  animate: "rise" | "flip";
}) {
  return (
    <article
      className={`relative rounded-[12px] bg-surface p-1.5 shadow-[0_1px_0_var(--p-line-strong),0_14px_30px_-24px_rgba(28,42,74,0.5)] ${
        animate === "flip" ? "animate-flip-in" : "animate-rise"
      }`}
    >
      <div className="rounded-[8px] border border-line">{children}</div>
    </article>
  );
}

/** Meandro grego em glauco: a dobra do card. */
function MeanderRule() {
  return (
    <svg width="100%" height="8" aria-hidden className="text-glauco">
      <defs>
        <pattern
          id="meandro-verso"
          width="12"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 7.5H10.5V.5H3.5V5H7.5V3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="8" fill="url(#meandro-verso)" />
    </svg>
  );
}

/** Verso curto vira manchete serifada; verso longo fica em texto corrido. */
function BackText({ text }: { text: string }) {
  return text.length <= 80 ? (
    <p className="font-display text-[23px] leading-[1.25]">{text}</p>
  ) : (
    <p className="text-[15px] leading-[1.55]">{text}</p>
  );
}

function PrimaryButton({
  children,
  onClick,
  autoFocus,
}: {
  children: ReactNode;
  onClick: () => void;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      onClick={onClick}
      className="h-[52px] rounded-[12px] bg-night text-base font-extrabold text-on-night"
    >
      {children}
    </button>
  );
}

const SELF_GRADES: {
  grade: ReviewGrade;
  label: string;
  hint: string;
  tone: string;
}[] = [
  {
    grade: "again",
    label: "De novo",
    hint: "nesta sessão",
    tone: "bg-coral text-on-coral",
  },
  {
    grade: "hard",
    label: "Difícil",
    hint: "mais cedo",
    tone: "bg-lamp text-on-lamp-accent",
  },
  {
    grade: "good",
    label: "Bom",
    hint: "no prazo",
    tone: "bg-glauco text-on-glauco",
  },
  {
    grade: "easy",
    label: "Fácil",
    hint: "mais tarde",
    tone: "bg-lavender text-lavender-ink",
  },
];

/** Autoavaliação estilo Anki: nota honesta agenda bem o card. */
function SelfGrade({
  busy,
  onGrade,
}: {
  busy: boolean;
  onGrade: (grade: ReviewGrade) => void;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-sans text-[15px] font-extrabold">
        Como foi lembrar?
      </h2>
      <div
        className="grid grid-cols-4 gap-2"
        role="group"
        aria-label="Como foi lembrar"
      >
        {SELF_GRADES.map(({ grade, label, hint, tone }) => (
          <button
            key={grade}
            type="button"
            disabled={busy}
            onClick={() => onGrade(grade)}
            className={`flex min-h-[68px] flex-col items-center justify-center gap-[5px] rounded-sm disabled:opacity-60 ${tone}`}
          >
            <span className="text-sm font-extrabold">{label}</span>
            <span className="flex items-center gap-[3px] text-xs font-semibold">
              <HourglassIcon size={12} />
              {hint}
            </span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        A clepsidra marca quando este card volta para você.
      </p>
    </section>
  );
}

function CardResult({
  card,
  phase,
}: {
  card: StudyCard;
  phase: Extract<Phase, { kind: "revealed" }>;
}) {
  const { result, chosen, tutorClosing } = phase;
  const good = result.correct;
  const verdict =
    card.kind === "flashcard"
      ? good
        ? result.grade === "hard"
          ? "Lembrou com esforço"
          : "Lembrou!"
        : "Vamos fixar isso"
      : good
        ? result.grade === "hard"
          ? "Chegou lá!"
          : "Acertou!"
        : "Ainda não. Vamos fixar isso";

  return (
    <div className="flex flex-col gap-3.5">
      {card.kind === "multiple_choice" && card.choices && (
        <ul className="flex flex-col gap-2">
          {card.choices.map((choice, i) => {
            const isRight = i === result.correct_choice;
            const isChosenWrong = i === chosen && !isRight;
            return (
              <li
                key={i}
                className={`flex min-h-12 items-center gap-3 rounded-sm border-[1.5px] px-3 py-1.5 text-[15px] font-bold ${
                  isRight
                    ? "border-glauco-mid bg-glauco-soft"
                    : isChosenWrong
                      ? "border-coral-mid bg-coral-soft"
                      : "border-line text-muted"
                }`}
              >
                <span
                  className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] font-mark ${
                    isRight
                      ? "bg-glauco text-on-glauco"
                      : isChosenWrong
                        ? "bg-coral text-on-coral"
                        : "bg-line"
                  }`}
                >
                  {LETTERS[i]}
                </span>
                {choice}
              </li>
            );
          })}
        </ul>
      )}

      {tutorClosing && (
        <div className="flex gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-panel text-glauco">
            <OwlLineIcon size={17} strokeWidth={1.9} />
          </span>
          <p className="text-[15px] leading-[1.55]">{tutorClosing}</p>
        </div>
      )}

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
        <span className="flex flex-col">
          <span
            className={`text-[15px] font-extrabold ${
              good ? "text-glauco-ink" : "text-coral-ink"
            }`}
          >
            {verdict}
          </span>
          <span className="text-[13px] text-muted">
            {result.interval_days === 0
              ? "Volta ainda nesta sessão"
              : result.interval_days === 1
                ? "Volta amanhã"
                : `Volta em ${result.interval_days} dias`}
          </span>
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

      <BackText text={result.answer} />

      {result.daily_goal_completed && (
        <p className="rounded-sm bg-lamp px-4 py-3 text-center text-sm font-bold text-on-lamp">
          Ânfora cheia! Meta do dia cumprida: +30 pts e +10 dracmas.
        </p>
      )}
    </div>
  );
}

function OpenDialog({
  dialog,
  typed,
  busy,
  onType,
  onSubmit,
}: {
  dialog: DialogTurn[];
  typed: string;
  busy: boolean;
  onType: (v: string) => void;
  onSubmit: (submittedAt: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {dialog.map((turn, i) =>
        turn.role === "tutor" ? (
          <div key={i} className="flex gap-2.5 animate-rise">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-panel text-glauco">
              <OwlLineIcon size={17} strokeWidth={1.9} />
            </span>
            <div className="flex flex-col gap-[3px]">
              <span className="text-xs font-bold text-glauco-deep">Tutor</span>
              <p className="text-[15px] leading-[1.55]">{turn.content}</p>
            </div>
          </div>
        ) : (
          <p
            key={i}
            className="ml-10 self-end rounded-[12px_2px_12px_12px] bg-lavender px-3.5 py-2.5 text-[15px] leading-[1.45] text-on-lavender"
          >
            {turn.content}
          </p>
        )
      )}
      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <OwlLineIcon size={18} className="animate-pulse text-glauco-deep" /> O
          tutor está pensando em uma boa pergunta…
        </p>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(Date.now());
        }}
      >
        <label htmlFor="resposta-aberta" className="sr-only">
          Sua explicação
        </label>
        <textarea
          id="resposta-aberta"
          value={typed}
          onChange={(e) => onType(e.target.value)}
          rows={3}
          disabled={busy}
          placeholder={
            dialog.length ? "Responda ao tutor…" : "Escreva sua explicação…"
          }
          className="rounded-sm border-[1.5px] border-input bg-surface px-3.5 py-3 text-[15px] focus:border-night focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !typed.trim()}
          className="h-12 rounded-sm bg-night text-[15px] font-extrabold text-on-night disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

function SessionSummary({
  totals,
  basePath,
}: {
  totals: Totals;
  basePath: string;
}) {
  const accuracy = totals.reviewed
    ? Math.round((totals.correct / totals.reviewed) * 100)
    : 0;
  return (
    <section className="flex flex-col gap-6 pt-2 animate-rise">
      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] leading-tight">Sessão concluída</h1>
        <p className="text-sm text-muted">
          Cada revisão deixa a lembrança mais forte.
        </p>
      </div>
      <dl className="grid grid-cols-3 rounded-lg bg-surface">
        <SummaryStat label="cards" value={String(totals.reviewed)} />
        <SummaryStat label="de acerto" value={`${accuracy}%`} border />
        <SummaryStat label="pontos" value={`+${totals.points}`} border />
      </dl>
      <p className="flex items-center gap-2 rounded-lg bg-lamp px-4 py-3.5 text-[15px] font-extrabold text-on-lamp animate-coin-pop">
        <CoinDot size={18} />+{totals.coins} dracmas
        {totals.goalCompleted && (
          <span className="ml-auto text-[13px] font-bold">
            Meta do dia cumprida!
          </span>
        )}
      </p>
      <div className="flex flex-col gap-2">
        <Link
          href={basePath}
          className="grid h-[52px] place-items-center rounded-[12px] bg-night font-extrabold text-on-night"
        >
          Voltar ao início
        </Link>
        <Link
          href={`${basePath}/podio`}
          className="grid h-12 place-items-center rounded-[12px] font-bold text-muted"
        >
          Ver o pódio
        </Link>
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  value,
  border = false,
}: {
  label: string;
  value: string;
  border?: boolean;
}) {
  return (
    <div className={`px-4 py-3.5 ${border ? "border-l border-line" : ""}`}>
      <dd className="font-display text-[28px] leading-none tabular-nums">
        {value}
      </dd>
      <dt className="mt-1 text-[13px] text-muted">{label}</dt>
    </div>
  );
}

function EmptyState({ basePath }: { basePath: string }) {
  return (
    <section className="flex flex-col gap-4 pt-2 animate-rise">
      <h1 className="text-[26px]">Revisão</h1>
      <div className="flex flex-col gap-3 rounded-lg bg-surface p-5">
        <h2 className="text-xl">Nada para revisar agora</h2>
        <p className="text-sm leading-relaxed text-muted">
          Você revisou tudo o que estava na hora. A memória precisa de
          intervalos: os cards voltam no momento certo.
        </p>
        <p className="text-[13px] text-muted">
          <span className="font-mark text-[15px] text-glauco-deep">
            ἀνάμνησις
          </span>{" "}
          · para Platão, aprender é relembrar.
        </p>
      </div>
      <Link
        href={`${basePath}/tutor`}
        className="grid h-[52px] place-items-center rounded-[12px] bg-night font-extrabold text-on-night"
      >
        Conversar com o tutor
      </Link>
    </section>
  );
}
