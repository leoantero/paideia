"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReviewResult, StudyCard } from "@/src/features/spaced-repetition/types";
import { SUBJECT_LABELS } from "@/src/features/spaced-repetition/types";
import { DrachmaCoin, FlameIcon, Laurel, OwlIcon } from "@/src/ui/paideia/icons";
import { GREEK_LETTERS, Meander } from "@/src/ui/paideia/ornaments";
import { SUBJECT_STYLE } from "./subject-style";

interface DialogTurn {
  role: "student" | "tutor";
  content: string;
}

type Phase =
  | { kind: "answering" }
  | { kind: "submitting" }
  | { kind: "revealed"; result: ReviewResult; chosen: number | null; tutorClosing: string | null };

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
  const [totals, setTotals] = useState<Totals>({ reviewed: 0, correct: 0, points: 0, coins: 0, goalCompleted: false });
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

  function applyResult(result: ReviewResult, chosen: number | null, tutorClosing: string | null) {
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

  async function submitObjective(response: string, chosen: number | null, submittedAt: number) {
    const durationMs = submittedAt - startedAt.current;
    setPhase({ kind: "submitting" });
    setError(null);
    try {
      const res = await fetch(reviewEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, response, durationMs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Algo deu errado.");
      applyResult(data as ReviewResult, chosen, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
      setPhase({ kind: "answering" });
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
        body: JSON.stringify({ cardId: card.id, history: dialog, answer, durationMs }),
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

  const style = SUBJECT_STYLE[card.subject];
  const revealed = phase.kind === "revealed" ? phase : null;
  const busy = phase.kind === "submitting";

  return (
    <div className="flex flex-col gap-5">
      <SessionProgress total={queue.length} current={index} />

      <article
        key={`${card.id}-${index}-${revealed ? "back" : "front"}`}
        className={`relative overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_18px_40px_-24px_rgba(31,26,22,0.45)] ${
          revealed ? "animate-flip-in" : "animate-rise"
        }`}
      >
        <div className="h-2" style={{ background: style.color }} />
        <div className="px-6 pb-6 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: style.color }}>
              <span className="font-display text-base">{style.glyph}</span>
              {SUBJECT_LABELS[card.subject]} · <span className="truncate normal-case tracking-normal text-ink-soft">{card.deck_title}</span>
            </p>
            {card.is_new && !revealed && (
              <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold-deep">
                novo
              </span>
            )}
          </div>

          {revealed ? (
            <CardBack card={card} phase={revealed} />
          ) : (
            <p className="mt-5 text-2xl font-semibold leading-snug">{card.prompt}</p>
          )}
        </div>
        <Meander height={10} color={style.color} className="opacity-25" />
      </article>

      {!revealed && card.kind === "multiple_choice" && card.choices && (
        <div className="flex flex-col gap-2.5" role="group" aria-label="Alternativas">
          {card.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => submitObjective(String(i), i, Date.now())}
              className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 py-3 text-left font-semibold transition-all hover:-translate-y-0.5 hover:border-ink/40 disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-marble-deep font-display text-lg">
                {GREEK_LETTERS[i]}
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
            if (typed.trim()) submitObjective(typed, null, Date.now());
          }}
        >
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Sua resposta"
            className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 py-3 font-semibold outline-none focus:border-ink/50"
          />
          <button
            type="submit"
            disabled={busy || !typed.trim()}
            className="rounded-2xl bg-ink px-5 font-extrabold text-marble disabled:opacity-40"
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

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-terracotta-soft px-4 py-3 text-sm font-semibold text-terracotta-deep">
          <span>{error}</span>
          <button type="button" onClick={next} className="shrink-0 underline">
            Pular card
          </button>
        </div>
      )}

      {revealed && (
        <button
          type="button"
          autoFocus
          onClick={next}
          className="rounded-full bg-ink px-6 py-4 text-lg font-extrabold text-marble shadow-[0_6px_0_0_var(--terracotta)] transition-transform active:translate-y-1 active:shadow-none"
        >
          {index + 1 < queue.length ? "Próximo card →" : "Ver resultado"}
        </button>
      )}
    </div>
  );
}

function SessionProgress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1" aria-label={`Card ${Math.min(current + 1, total)} de ${total}`}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 rounded-[2px] transition-colors ${
              i < current ? "bg-terracotta" : i === current ? "bg-ink" : "bg-marble-deep"
            }`}
          />
        ))}
      </div>
      <span className="font-display text-sm tabular-nums text-ink-soft">
        {Math.min(current + 1, total)}/{total}
      </span>
    </div>
  );
}

function CardBack({
  card,
  phase,
}: {
  card: StudyCard;
  phase: Extract<Phase, { kind: "revealed" }>;
}) {
  const { result, chosen, tutorClosing } = phase;
  const verdict = result.correct
    ? result.grade === "hard"
      ? { label: "Chegou lá!", tone: "text-gold-deep", bg: "bg-gold-soft" }
      : { label: "Acertou!", tone: "text-olive", bg: "bg-olive-soft" }
    : { label: "Vamos fixar isso", tone: "text-terracotta", bg: "bg-terracotta-soft" };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-sm text-ink-soft">{card.prompt}</p>

      {card.kind === "multiple_choice" && card.choices && (
        <ul className="flex flex-col gap-1.5">
          {card.choices.map((choice, i) => {
            const isRight = i === result.correct_choice;
            const isChosenWrong = i === chosen && !isRight;
            return (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                  isRight ? "bg-olive-soft text-olive" : isChosenWrong ? "bg-terracotta-soft text-terracotta line-through" : "text-ink-soft"
                }`}
              >
                <span className="font-display">{GREEK_LETTERS[i]}</span> {choice}
              </li>
            );
          })}
        </ul>
      )}

      {tutorClosing && (
        <p className="flex gap-2 rounded-2xl bg-marble px-3 py-2 text-sm">
          <OwlIcon size={20} className="shrink-0 text-aegean" /> {tutorClosing}
        </p>
      )}

      <div className={`rounded-2xl px-4 py-3 ${verdict.bg}`}>
        <p className={`font-display text-2xl ${verdict.tone}`}>{verdict.label}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-ink">{result.answer}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-ink-soft">
          {result.interval_days === 0
            ? "Volta ainda nesta sessão"
            : result.interval_days === 1
              ? "Volta amanhã"
              : `Volta em ${result.interval_days} dias`}
        </span>
        {(result.points > 0 || result.coins > 0) && (
          <span className="flex items-center gap-2 font-extrabold animate-coin-pop">
            <span className="text-aegean">+{result.points} pts</span>
            {result.coins > 0 && (
              <span className="flex items-center gap-1 text-gold-deep">
                +{result.coins} <DrachmaCoin size={18} />
              </span>
            )}
          </span>
        )}
      </div>
      {result.daily_goal_completed && (
        <p className="rounded-2xl bg-ink px-4 py-3 text-center text-sm font-bold text-gold">
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
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <OwlIcon size={20} className="text-aegean" />
        Explique com suas palavras. O tutor vai te ajudar a chegar lá.
      </p>
      {dialog.map((turn, i) =>
        turn.role === "tutor" ? (
          <div key={i} className="flex gap-2 animate-rise">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aegean text-marble">
              <OwlIcon size={18} />
            </span>
            <p className="rounded-2xl rounded-tl-sm bg-aegean-soft px-4 py-2.5 text-[15px]">{turn.content}</p>
          </div>
        ) : (
          <p key={i} className="ml-10 self-end rounded-2xl rounded-tr-sm bg-ink px-4 py-2.5 text-[15px] text-marble">
            {turn.content}
          </p>
        )
      )}
      {busy && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <OwlIcon size={18} className="animate-pulse text-aegean" /> O tutor está pensando em uma boa pergunta…
        </p>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(Date.now());
        }}
      >
        <textarea
          value={typed}
          onChange={(e) => onType(e.target.value)}
          rows={3}
          disabled={busy}
          placeholder={dialog.length ? "Responda ao tutor…" : "Escreva sua explicação…"}
          className="rounded-2xl border-2 border-line bg-surface px-4 py-3 outline-none focus:border-aegean"
        />
        <button
          type="submit"
          disabled={busy || !typed.trim()}
          className="self-end rounded-full bg-aegean px-6 py-3 font-extrabold text-marble disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

function SessionSummary({ totals, basePath }: { totals: Totals; basePath: string }) {
  const accuracy = totals.reviewed ? Math.round((totals.correct / totals.reviewed) * 100) : 0;
  return (
    <section className="flex flex-col items-center gap-5 pt-4 text-center animate-rise">
      <div className="relative flex items-center justify-center">
        <Laurel size={150} color="var(--olive)" />
        <FlameIcon size={52} className="absolute text-ink" />
      </div>
      <div>
        <h1 className="font-display text-4xl">Sessão concluída</h1>
        <p className="mt-1 text-ink-soft">Cada revisão deixa a lembrança mais forte.</p>
      </div>
      <div className="grid w-full grid-cols-3 gap-3">
        <SummaryStat label="cards" value={String(totals.reviewed)} />
        <SummaryStat label="de acerto" value={`${accuracy}%`} />
        <SummaryStat label="pontos" value={`+${totals.points}`} tone="text-aegean" />
      </div>
      <p className="flex items-center gap-2 text-lg font-extrabold text-gold-deep animate-coin-pop">
        +{totals.coins} <DrachmaCoin size={26} /> dracmas
      </p>
      {totals.goalCompleted && (
        <p className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-gold">Meta do dia cumprida!</p>
      )}
      <div className="flex w-full flex-col gap-2">
        <Link href={basePath} className="rounded-full bg-ink px-6 py-4 font-extrabold text-marble">
          Voltar ao início
        </Link>
        <Link href={`${basePath}/arena`} className="rounded-full border-2 border-line px-6 py-3 font-bold">
          Ver o pódio
        </Link>
      </div>
    </section>
  );
}

function SummaryStat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className={`font-display text-3xl ${tone}`}>{value}</p>
      <p className="text-xs font-semibold text-ink-soft">{label}</p>
    </div>
  );
}

function EmptyState({ basePath }: { basePath: string }) {
  return (
    <section className="flex flex-col items-center gap-4 pt-8 text-center animate-rise">
      <Laurel size={120} />
      <h1 className="font-display text-3xl">Nada para revisar agora</h1>
      <p className="max-w-sm text-ink-soft">
        Você revisou tudo o que estava na hora. A memória precisa de intervalos: os cards voltam no momento certo.
      </p>
      <Link href={`${basePath}/tutor`} className="rounded-full bg-aegean px-6 py-3 font-extrabold text-marble">
        Conversar com o tutor
      </Link>
    </section>
  );
}
