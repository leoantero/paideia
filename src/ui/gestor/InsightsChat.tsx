"use client";

import { useEffect, useRef, useState } from "react";
import { RichText } from "@/src/ui/RichText";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Onde a escola está mais fraca?",
  "Quais professores engajam menos?",
  "Como está a adesão das famílias?",
  "O que priorizar no próximo bimestre?",
];

export function InsightsChat({ scopeLabel }: { scopeLabel: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setInput("");
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setSending(true);
    try {
      const res = await fetch("/api/gestor/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: messages }),
      });
      if (!res.ok)
        throw new Error((await res.json())?.error ?? "Algo deu errado.");
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line bg-surface px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-ink text-lg text-gold">
            📊
          </span>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-bold text-ink">
              Insights
            </div>
            <div className="truncate text-[11px] text-muted">
              {scopeLabel} · só agregados
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <>
            <div className="rounded-[14px] border-[1.5px] border-mist bg-mist px-3.5 py-2.5 text-sm leading-relaxed text-ink">
              Pergunte sobre uso, engajamento por professor, domínio por matéria
              ou adesão das famílias. Eu leio apenas números agregados desta
              unidade — nunca conversas de alunos.
            </div>
            <div className="flex flex-wrap gap-[7px]">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border-[1.5px] border-mist bg-surface px-3.5 py-[7px] text-[13px] font-medium text-ink hover:border-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
        {sending && <Typing />}
        {error && <p className="text-sm font-medium text-weak">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line bg-surface px-4 py-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre a escola…"
            className="flex-1 rounded-[12px] border-2 border-mist bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-ink"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] ${
              input.trim() && !sending ? "bg-ink" : "bg-mist"
            }`}
          >
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="white"
              strokeWidth="2.5"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19V5M5 12l7-7 7 7"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const mine = msg.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && (
        <span className="mr-2 grid h-7 w-7 shrink-0 self-end place-items-center rounded-lg bg-ink text-sm text-gold">
          📊
        </span>
      )}
      <div
        className={`max-w-[78%] whitespace-pre-wrap border-[1.5px] px-3.5 py-2.5 text-sm leading-relaxed text-ink ${
          mine
            ? "rounded-[14px] rounded-br-[4px] border-mist-soft bg-mist"
            : "rounded-[14px] rounded-bl-[4px] border-line bg-surface"
        }`}
      >
        <RichText text={msg.content} />
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink text-sm text-gold">
        📊
      </span>
      <div className="flex gap-1 rounded-[14px] rounded-bl-[4px] border-[1.5px] border-line bg-surface px-4 py-2.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-ink/40" />
        ))}
      </div>
    </div>
  );
}
