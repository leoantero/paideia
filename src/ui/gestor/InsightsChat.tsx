"use client";

import { useEffect, useRef, useState } from "react";
import { RichText } from "@/src/ui/RichText";
import { ArrowRightIcon, BarsIcon } from "@/src/ui/paideia/line-icons";

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
      <div className="flex items-center gap-3 border-b border-line-strong bg-surface px-5 pb-3.5 pt-[18px]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-panel text-glauco">
          <BarsIcon size={22} strokeWidth={1.7} />
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="text-[22px] leading-tight">Insights</h1>
          <span className="truncate text-[13px] text-muted">
            {scopeLabel} · só agregados
          </span>
        </div>
      </div>

      <ol className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-[18px]">
        {messages.length === 0 && (
          <li className="flex flex-col gap-4">
            <p className="text-[15px] leading-[1.55]">
              Pergunte sobre uso, engajamento por professor, domínio por matéria
              ou adesão das famílias. Eu leio apenas números agregados desta
              unidade, nunca conversas de alunos.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="min-h-11 rounded-sm border-[1.5px] border-input bg-surface px-3.5 text-[13.5px] font-bold text-ink hover:border-night"
                >
                  {s}
                </button>
              ))}
            </div>
          </li>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <li key={i} className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-lavender-ink">Você</span>
              <p className="max-w-[82%] whitespace-pre-wrap rounded-[12px_2px_12px_12px] bg-lavender px-3.5 py-2.5 text-[15px] leading-[1.45] text-on-lavender">
                {m.content}
              </p>
            </li>
          ) : (
            <InsightLine key={i}>
              <RichText text={m.content} />
            </InsightLine>
          )
        )}
        {sending && (
          <InsightLine>
            <span className="flex gap-1 py-2" aria-label="Pensando">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-glauco-mid"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </InsightLine>
        )}
        {error && (
          <li className="text-sm font-semibold text-coral-ink">{error}</li>
        )}
        <div ref={bottomRef} />
      </ol>

      <form
        className="flex gap-2 border-t border-line-strong bg-surface px-5 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="insights-pergunta" className="sr-only">
          Sua pergunta
        </label>
        <input
          id="insights-pergunta"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte sobre a escola"
          className="h-[46px] min-w-0 flex-1 rounded-sm border-[1.5px] border-input bg-bg px-3.5 text-[15px] text-ink placeholder:text-faint focus:border-night focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!input.trim() || sending}
          className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-sm bg-night text-on-night disabled:opacity-40"
        >
          <ArrowRightIcon size={21} />
        </button>
      </form>
    </div>
  );
}

function InsightLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-panel text-glauco">
        <BarsIcon size={16} strokeWidth={2} />
      </span>
      <div className="min-w-0 whitespace-pre-wrap text-[15px] leading-[1.55]">
        {children}
      </div>
    </li>
  );
}
