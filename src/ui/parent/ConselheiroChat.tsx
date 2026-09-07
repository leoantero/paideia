"use client";

import { useEffect, useRef, useState } from "react";
import type { LinkedChild } from "@/src/features/user-profiles/parent-profile-service";
import { Segmented } from "@/src/ui/kit";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function bubbleLabel(child?: LinkedChild) {
  return child
    ? `Lê o progresso de ${child.full_name.split(" ")[0]} · não as conversas`
    : "";
}

export function ConselheiroChat({ children }: { children: LinkedChild[] }) {
  const [selected, setSelected] = useState(children[0]?.id ?? "");
  const child = children.find((c) => c.id === selected) ?? children[0];
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Trocar de filho começa uma conversa nova — o contexto do conselheiro é
  // por criança, misturar seria confuso e tecnicamente errado (dados de outro
  // filho vazando na mesma janela).
  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [selected]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !child) return;
    setError(null);
    setInput("");
    const nextHistory = [...messages, { role: "user" as const, content: text }];
    setMessages(nextHistory);
    setSending(true);
    try {
      const res = await fetch("/api/parent/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: child.id,
          childFirstName: child.full_name,
          message: text,
          history: messages,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.json())?.error ?? "Algo deu errado.");
      }
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setSending(false);
    }
  }

  if (!child) {
    return (
      <div className="flex h-full items-center justify-center p-5 text-center text-sm text-muted">
        Nenhuma criança vinculada ainda.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line bg-surface px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-gold text-lg">
            💡
          </span>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-bold text-ink">
              Conselheiro
            </div>
            <div className="truncate text-[11px] text-muted">
              {bubbleLabel(child)}
            </div>
          </div>
        </div>
        {children.length > 1 && (
          <Segmented
            className="mt-3"
            value={selected}
            onChange={setSelected}
            options={children.map((c) => ({
              value: c.id,
              label: c.full_name.split(" ")[0],
            }))}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="rounded-[14px] border-[1.5px] border-mist bg-mist px-3.5 py-2.5 text-sm leading-relaxed text-ink">
            Olá! Pergunte como apoiar {child.full_name.split(" ")[0]} em casa —
            posso falar sobre o domínio por matéria e onde vale focar.
          </div>
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
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Como posso ajudar em casa?"
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
        <span className="mr-2 grid h-7 w-7 shrink-0 self-end place-items-center rounded-lg bg-gold text-sm">
          💡
        </span>
      )}
      <div
        className={`max-w-[78%] whitespace-pre-wrap border-[1.5px] px-3.5 py-2.5 text-sm leading-relaxed text-ink ${
          mine
            ? "rounded-[14px] rounded-br-[4px] border-mist-soft bg-mist"
            : "rounded-[14px] rounded-bl-[4px] border-line bg-surface"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold text-sm">
        💡
      </span>
      <div className="flex gap-1 rounded-[14px] rounded-bl-[4px] border-[1.5px] border-line bg-surface px-4 py-2.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-ink/40" />
        ))}
      </div>
    </div>
  );
}
