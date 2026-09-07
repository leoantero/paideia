"use client";

import { useState } from "react";
import { ScreenHeader } from "@/src/ui/AppShell";
import { BackButton } from "@/src/ui/kit";
import { SUBJECTS, type DeckContent, type Subject } from "@/src/ui/student/revisao-data";

type View = "subjects" | "contents" | "cards";

export function RevisaoScreen() {
  const [view, setView] = useState<View>("subjects");
  const [subject, setSubject] = useState<Subject | null>(null);
  const [content, setContent] = useState<DeckContent | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState<number[]>([]);

  function openSubject(s: Subject) {
    setSubject(s);
    setView("contents");
  }
  function openContent(c: DeckContent) {
    setContent(c);
    setCardIndex(0);
    setFlipped(false);
    setDone([]);
    setView("cards");
  }
  function next() {
    setFlipped(false);
    setTimeout(() => {
      if (content) setCardIndex((i) => (i + 1) % content.ankiCards.length);
    }, 200);
  }
  function markKnown() {
    setDone((d) => (d.includes(cardIndex) ? d : [...d, cardIndex]));
    next();
  }

  // ─────────────── SUBJECTS ───────────────
  if (view === "subjects") {
    return (
      <div className="flex min-h-full flex-col p-5">
        <ScreenHeader title="Revisão" subtitle="Escolha uma disciplina para revisar" />
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
              <span className="text-[10px] opacity-60" style={{ color: s.color }}>
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
              style={{ borderColor: c.due > 0 ? subject.color + "44" : "var(--color-line)" }}
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
                  <span className="text-[11px] font-semibold text-strong">✓ em dia</span>
                )}
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--color-faint)" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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
    const card = content.ankiCards[cardIndex];
    const pct = (done.length / content.ankiCards.length) * 100;
    return (
      <div className="flex min-h-full flex-col p-5">
        <BackButton onClick={() => setView("contents")}>{subject.name}</BackButton>

        <div className="mb-4 mt-4">
          <h1 className="font-display text-[18px] font-extrabold text-ink">
            {content.name}
          </h1>
          <div className="mt-1 flex items-center justify-between text-[13px]">
            <p className="text-muted">
              Card {cardIndex + 1} de {content.ankiCards.length}
            </p>
            <p className="font-semibold text-strong">{done.length} acertados</p>
          </div>
          <div className="mt-2 h-1 rounded bg-line">
            <div
              className="h-full rounded transition-[width]"
              style={{ width: `${pct}%`, background: subject.color }}
            />
          </div>
        </div>

        <div
          className="card-flip mb-5 h-[220px]"
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
              <p className="text-xs text-faint">Toque para ver a resposta</p>
            </div>
            <div
              className="card-face card-back flex flex-col justify-between rounded-[16px] border-2 p-5"
              style={{ background: subject.bg, borderColor: subject.color + "44" }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Resposta
              </span>
              <p className="text-sm leading-relaxed text-ink">{card.back}</p>
              <p className="text-xs text-muted">Como você foi?</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={next}
            className="flex-1 rounded-[12px] border-2 border-line bg-bg py-3 text-sm font-semibold text-muted"
          >
            Difícil — revisar
          </button>
          <button
            type="button"
            onClick={markKnown}
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
