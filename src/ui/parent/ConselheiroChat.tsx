"use client";

import { useEffect, useRef, useState } from "react";
import { RichText } from "@/src/ui/RichText";
import type { LinkedChild } from "@/src/features/user-profiles/parent-profile-service";
import { ArrowRightIcon, LampIcon } from "@/src/ui/paideia/line-icons";
import { ChildTabs } from "./PainelView";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function bubbleLabel(child?: LinkedChild) {
  return child
    ? `Lê o progresso de ${child.full_name.split(" ")[0]}, não as conversas`
    : "";
}

export function ConselheiroChat({ students }: { students: LinkedChild[] }) {
  const [selected, setSelected] = useState(students[0]?.id ?? "");
  const child = students.find((c) => c.id === selected) ?? students[0];
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Trocar de filho começa uma conversa nova — o contexto do conselheiro é
  // por criança, e misturar seria confuso além de errado (resposta sobre um
  // filho no meio do histórico do outro).
  //
  // Isso é uma reação a um EVENTO do usuário, não sincronização com sistema
  // externo — por isso mora no handler e não num efeito. Como efeito, gerava
  // render em cascata (react-hooks/set-state-in-effect).
  function selectChild(id: string) {
    if (id === selected) return;
    setSelected(id);
    setMessages([]);
    setError(null);
  }

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

  const firstName = child.full_name.split(" ")[0];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-line-strong bg-surface px-5 pb-3.5 pt-[18px]">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-lamp text-on-lamp-accent">
            <LampIcon size={23} />
          </span>
          <div className="flex min-w-0 flex-col">
            <h1 className="text-[22px] leading-tight">Conselheiro</h1>
            <span className="truncate text-[13px] text-muted">
              {bubbleLabel(child)}
            </span>
          </div>
        </div>
        {students.length > 1 && (
          <ChildTabs
            size="sm"
            students={students}
            selected={child.id}
            onSelect={selectChild}
          />
        )}
      </div>

      <ol className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-[18px]">
        <AdvisorLine>
          Olá! Pergunte como apoiar {firstName} em casa. Posso falar sobre o
          domínio por matéria e onde vale focar.
        </AdvisorLine>
        {messages.map((m, i) =>
          m.role === "user" ? (
            <li key={i} className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-lavender-ink">Você</span>
              <p className="max-w-[82%] whitespace-pre-wrap rounded-[12px_2px_12px_12px] bg-lavender px-3.5 py-2.5 text-[15px] leading-[1.45] text-on-lavender">
                {m.content}
              </p>
            </li>
          ) : (
            <AdvisorLine key={i}>
              <RichText text={m.content} />
            </AdvisorLine>
          )
        )}
        {sending && (
          <AdvisorLine>
            <span className="flex gap-1 py-2" aria-label="Pensando">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-coin"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </AdvisorLine>
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
          send();
        }}
      >
        <label htmlFor="conselheiro-pergunta" className="sr-only">
          Sua pergunta
        </label>
        <input
          id="conselheiro-pergunta"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Como posso ajudar em casa?"
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

function AdvisorLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-lamp text-on-lamp-accent">
        <LampIcon size={17} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 whitespace-pre-wrap text-[15px] leading-[1.55]">
        {children}
      </div>
    </li>
  );
}
