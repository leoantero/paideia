"use client";

import { useState } from "react";
import { ScreenHeader } from "@/src/ui/AppShell";
import { BackButton } from "@/src/ui/kit";
import { styleFor } from "@/src/ui/student/revisao-data";
import type {
  ReviewDeck,
  ReviewSubject,
} from "@/src/features/spaced-repetition/review-service";

type View = "subjects" | "decks" | "cards";

export function RevisaoScreen({ subjects }: { subjects: ReviewSubject[] }) {
  const [view, setView] = useState<View>("subjects");
  const [subject, setSubject] = useState<ReviewSubject | null>(null);
  const [deck, setDeck] = useState<ReviewDeck | null>(null);

  // Fila de índices pendentes. "Difícil" manda o card pro fim da fila em vez
  // de só avançar — um card só sai quando o aluno marca que sabia.
  const [queue, setQueue] = useState<number[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exit, setExit] = useState<"left" | "right" | null>(null);

  function openDeck(d: ReviewDeck) {
    setDeck(d);
    setQueue(d.cards.map((_, i) => i));
    setDoneCount(0);
    setFlipped(false);
    setExit(null);
    setView("cards");
  }

  function respond(known: boolean) {
    if (exit || !deck) return; // debounce durante a animação
    const cardId = deck.cards[queue[0]]?.id;
    setExit(known ? "right" : "left");

    // Grava a evidência (retrieval_review). Falha aqui não trava a revisão —
    // o aluno continua estudando; o que se perde é o registro daquele card.
    if (cardId) {
      void fetch("/api/student/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, known }),
      }).catch(() => {});
    }

    setTimeout(() => {
      setQueue((q) => {
        const [head, ...rest] = q;
        return known ? rest : [...rest, head];
      });
      if (known) setDoneCount((d) => d + 1);
      setFlipped(false);
      setExit(null);
    }, 320);
  }

  // ─────────────── MATÉRIAS ───────────────
  if (view === "subjects") {
    return (
      <div className="flex min-h-full flex-col p-5">
        <ScreenHeader
          title="Revisão"
          subtitle="O que está vencido vem do seu próprio histórico"
        />
        {subjects.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum baralho disponível ainda para a sua série.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {subjects.map((s) => {
              const st = styleFor(s.subject);
              return (
                <button
                  key={s.subject}
                  type="button"
                  onClick={() => {
                    setSubject(s);
                    setView("decks");
                  }}
                  className="flex flex-col gap-1.5 rounded-[16px] border-2 p-3 text-left transition-transform active:scale-[0.98]"
                  style={{ background: st.bg, borderColor: st.color + "22" }}
                >
                  <span className="text-[22px]">{st.icon}</span>
                  <span
                    className="font-display text-sm font-bold leading-tight"
                    style={{ color: st.color }}
                  >
                    {st.label}
                  </span>
                  <span>
                    {s.dueDecks > 0 ? (
                      <span
                        className="rounded-[10px] px-[7px] py-0.5 text-[11px] font-bold text-white"
                        style={{ background: st.color }}
                      >
                        {s.dueDecks} para hoje
                      </span>
                    ) : (
                      <span className="text-[11px] text-faint">Em dia ✓</span>
                    )}
                  </span>
                  <span
                    className="text-[10px] opacity-60"
                    style={{ color: st.color }}
                  >
                    {s.totalCards} cards
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────── BARALHOS DA MATÉRIA ───────────────
  if (view === "decks" && subject) {
    const st = styleFor(subject.subject);
    return (
      <div className="flex min-h-full flex-col p-5">
        <BackButton onClick={() => setView("subjects")}>Disciplinas</BackButton>
        <div className="mb-5 mt-4 flex items-center gap-2.5">
          <span className="text-[26px]">{st.icon}</span>
          <div>
            <h1
              className="font-display text-[20px] font-extrabold"
              style={{ color: st.color }}
            >
              {st.label}
            </h1>
            <p className="text-[13px] text-muted">Escolha um conteúdo</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {subject.decks.map((d) => (
            <button
              key={d.conceptId}
              type="button"
              onClick={() => openDeck(d)}
              className="flex items-center justify-between rounded-[14px] border-[1.5px] bg-surface px-4 py-3.5 text-left"
              style={{
                borderColor: d.due ? st.color + "44" : "var(--color-line)",
              }}
            >
              <div className="min-w-0 pr-2">
                <div className="text-sm font-semibold text-ink">
                  {d.conceptName}
                </div>
                <div className="mt-0.5 text-xs text-faint">
                  {d.cards.length} {d.cards.length === 1 ? "card" : "cards"}
                  {d.masteryPct !== null && ` · ${d.masteryPct}% de domínio`}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {d.due ? (
                  <span
                    className="rounded-[10px] px-2.5 py-[3px] text-[11px] font-bold text-white"
                    style={{ background: st.color }}
                  >
                    revisar
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-strong">
                    ✓ em dia
                  </span>
                )}
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="var(--color-faint)"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────── CARDS ───────────────
  if (view === "cards" && subject && deck) {
    const st = styleFor(subject.subject);
    const total = deck.cards.length;
    const pct = total > 0 ? (doneCount / total) * 100 : 0;

    if (queue.length === 0) {
      return (
        <div className="flex min-h-full flex-col p-5">
          <BackButton onClick={() => setView("decks")}>{st.label}</BackButton>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span
              className="grid h-16 w-16 place-items-center rounded-full text-[28px] text-white"
              style={{ background: st.color }}
            >
              ✓
            </span>
            <h1 className="font-display text-[20px] font-extrabold text-ink">
              Baralho concluído!
            </h1>
            <p className="text-sm text-muted">
              Você revisou {total} {total === 1 ? "card" : "cards"} de{" "}
              {deck.conceptName}.
            </p>
            <p className="max-w-[280px] text-xs text-faint">
              O resultado já entrou no seu histórico e ajusta quando este
              conteúdo volta a aparecer.
            </p>
            <button
              type="button"
              onClick={() => setView("decks")}
              className="mt-2 rounded-[12px] px-6 py-3 text-sm font-semibold text-white"
              style={{ background: st.color }}
            >
              Voltar aos conteúdos
            </button>
          </div>
        </div>
      );
    }

    const card = deck.cards[queue[0]];
    const peek1 = queue.length > 1;
    const peek2 = queue.length > 2;

    return (
      <div className="flex min-h-full flex-col p-5">
        <BackButton onClick={() => setView("decks")}>{st.label}</BackButton>

        <div className="mb-4 mt-4">
          <h1 className="font-display text-[18px] font-extrabold text-ink">
            {deck.conceptName}
          </h1>
          <div className="mt-1 flex items-center justify-between text-[13px]">
            <p className="text-muted">
              {doneCount} de {total} concluídos
            </p>
            <p className="font-semibold text-strong">{doneCount} acertados</p>
          </div>
          <div className="mt-2 h-1 rounded bg-line">
            <div
              className="h-full rounded transition-[width]"
              style={{ width: `${pct}%`, background: st.color }}
            />
          </div>
        </div>

        <div className="deck-stack mb-5 h-[220px]">
          {peek2 && <div className="deck-peek deck-peek-2" aria-hidden />}
          {peek1 && <div className="deck-peek deck-peek-1" aria-hidden />}
          <div
            className={`deck-front h-full ${exit === "right" ? "deck-exit-right" : ""} ${exit === "left" ? "deck-exit-left" : ""}`}
          >
            <div
              className="card-flip h-full"
              onClick={() => setFlipped((f) => !f)}
            >
              <div className={`card-inner ${flipped ? "flipped" : ""}`}>
                <div
                  className="card-face flex flex-col justify-between overflow-y-auto rounded-[16px] border-2 bg-surface p-5"
                  style={{ borderColor: st.color + "44" }}
                >
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: st.color }}
                  >
                    {st.label}
                  </span>
                  <p className="font-display text-[17px] font-bold leading-snug text-ink">
                    {card.front}
                  </p>
                  <p className="text-xs text-faint">
                    Toque para ver a resposta
                  </p>
                </div>
                <div
                  className="card-face card-back flex flex-col justify-between overflow-y-auto rounded-[16px] border-2 p-5"
                  style={{ background: st.bg, borderColor: st.color + "44" }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Resposta
                  </span>
                  <p className="text-sm leading-relaxed text-ink">
                    {card.back}
                  </p>
                  <p className="text-xs text-muted">Como você foi?</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => respond(false)}
            className="flex-1 rounded-[12px] border-2 border-line bg-bg py-3 text-sm font-semibold text-muted"
          >
            Difícil — revisar
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            className="flex-1 rounded-[12px] py-3 text-sm font-semibold text-white"
            style={{ background: st.color }}
          >
            Sabia! ✓
          </button>
        </div>
      </div>
    );
  }

  return null;
}
