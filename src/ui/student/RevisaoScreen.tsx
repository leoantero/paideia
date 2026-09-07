"use client";

import { useState } from "react";
import { ScreenHeader } from "@/src/ui/AppShell";
import { BackButton } from "@/src/ui/kit";
import {
  SUBJECTS,
  type DeckContent,
  type Subject,
} from "@/src/ui/student/revisao-data";

type View = "subjects" | "contents" | "cards";

export function RevisaoScreen() {
  const [view, setView] = useState<View>("subjects");
  const [subject, setSubject] = useState<Subject | null>(null);
  const [content, setContent] = useState<DeckContent | null>(null);
  // Fila de índices ainda pendentes. "Difícil" manda o card pro fim da fila
  // em vez de simplesmente avançar — por isso o bug antigo (ciclava com % e
  // voltava pros cards fáceis já vistos) não existe mais: um card só sai da
  // fila quando é marcado como sabido.
  const [queue, setQueue] = useState<number[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exit, setExit] = useState<"left" | "right" | null>(null);

  function openSubject(s: Subject) {
    setSubject(s);
    setView("contents");
  }
  function openContent(c: DeckContent) {
    setContent(c);
    setQueue(c.ankiCards.map((_, i) => i));
    setDoneCount(0);
    setFlipped(false);
    setExit(null);
    setView("cards");
  }
  function respond(known: boolean) {
    if (exit) return; // debounce durante a animação de saída
    setExit(known ? "right" : "left");
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

  // ─────────────── SUBJECTS ───────────────
  if (view === "subjects") {
    return (
      <div className="flex min-h-full flex-col p-5">
        <ScreenHeader
          title="Revisão"
          subtitle="Escolha uma disciplina para revisar"
        />
        <div className="grid grid-cols-2 gap-2.5">
          {SUBJECTS.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => openSubject(s)}
              className="flex flex-col gap-1.5 rounded-[16px] border-2 p-3 text-left transition-transform active:scale-[0.98]"
              style={{ background: s.bg, borderColor: s.color + "22" }}
            >
              <span className="text-[22px]">{s.icon}</span>
              <span
                className="font-display text-sm font-bold leading-tight"
                style={{ color: s.color }}
              >
                {s.name}
              </span>
              <span>
                {s.dueCards > 0 ? (
                  <span
                    className="rounded-[10px] px-[7px] py-0.5 text-[11px] font-bold text-white"
                    style={{ background: s.color }}
                  >
                    {s.dueCards} para hoje
                  </span>
                ) : (
                  <span className="text-[11px] text-faint">Em dia ✓</span>
                )}
              </span>
              <span
                className="text-[10px] opacity-60"
                style={{ color: s.color }}
              >
                {s.totalCards} cards
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────── CONTENTS ───────────────
  if (view === "contents" && subject) {
    return (
      <div className="flex min-h-full flex-col p-5">
        <BackButton onClick={() => setView("subjects")}>Disciplinas</BackButton>
        <div className="mb-5 mt-4 flex items-center gap-2.5">
          <span className="text-[26px]">{subject.icon}</span>
          <div>
            <h1
              className="font-display text-[20px] font-extrabold"
              style={{ color: subject.color }}
            >
              {subject.name}
            </h1>
            <p className="text-[13px] text-muted">Escolha um conteúdo</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {subject.contents.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => openContent(c)}
              className="flex items-center justify-between rounded-[14px] border-[1.5px] bg-surface px-4 py-3.5 text-left"
              style={{
                borderColor:
                  c.due > 0 ? subject.color + "44" : "var(--color-line)",
              }}
            >
              <div>
                <div className="text-sm font-semibold text-ink">{c.name}</div>
                <div className="mt-0.5 text-xs text-faint">{c.cards} cards</div>
              </div>
              <div className="flex items-center gap-2">
                {c.due > 0 ? (
                  <span
                    className="rounded-[10px] px-2.5 py-[3px] text-[11px] font-bold text-white"
                    style={{ background: subject.color }}
                  >
                    {c.due} hoje
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
  if (view === "cards" && subject && content) {
    const total = content.ankiCards.length;
    const pct = (doneCount / total) * 100;

    // ─────────── concluído ───────────
    if (queue.length === 0) {
      return (
        <div className="flex min-h-full flex-col p-5">
          <BackButton onClick={() => setView("contents")}>
            {subject.name}
          </BackButton>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span
              className="grid h-16 w-16 place-items-center rounded-full text-[28px] text-white"
              style={{ background: subject.color }}
            >
              ✓
            </span>
            <h1 className="font-display text-[20px] font-extrabold text-ink">
              Baralho concluído!
            </h1>
            <p className="text-sm text-muted">
              Você revisou {total} {total === 1 ? "card" : "cards"} de{" "}
              {content.name}.
            </p>
            <button
              type="button"
              onClick={() => setView("contents")}
              className="mt-2 rounded-[12px] px-6 py-3 text-sm font-semibold text-white"
              style={{ background: subject.color }}
            >
              Voltar aos conteúdos
            </button>
          </div>
        </div>
      );
    }

    const card = content.ankiCards[queue[0]];
    const peek1 = queue.length > 1;
    const peek2 = queue.length > 2;

    return (
      <div className="flex min-h-full flex-col p-5">
        <BackButton onClick={() => setView("contents")}>
          {subject.name}
        </BackButton>

        <div className="mb-4 mt-4">
          <h1 className="font-display text-[18px] font-extrabold text-ink">
            {content.name}
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
              style={{ width: `${pct}%`, background: subject.color }}
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
                  className="card-face flex flex-col justify-between rounded-[16px] border-2 bg-surface p-5"
                  style={{ borderColor: subject.color + "44" }}
                >
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: subject.color }}
                  >
                    {subject.name}
                  </span>
                  <p className="font-display text-[18px] font-bold leading-snug text-ink">
                    {card.front}
                  </p>
                  <p className="text-xs text-faint">
                    Toque para ver a resposta
                  </p>
                </div>
                <div
                  className="card-face card-back flex flex-col justify-between rounded-[16px] border-2 p-5"
                  style={{
                    background: subject.bg,
                    borderColor: subject.color + "44",
                  }}
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
            style={{ background: subject.color }}
          >
            Sabia! ✓
          </button>
        </div>
      </div>
    );
  }

  return null;
}
