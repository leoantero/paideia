"use client";

import { useEffect, useRef, useState } from "react";
import { RichText } from "@/src/ui/RichText";
import { DrachmaCoin, OwlIcon } from "@/src/ui/paideia/icons";

export interface ConversationSummary {
  id: string;
  title: string | null;
  subject: string | null;
  updated_at: string;
}

interface Reward {
  awarded: boolean;
  points?: number;
  coins?: number;
}

interface Msg {
  role: "student" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Equações do 2º grau",
  "Funções afins",
  "Revolução Francesa",
  "Probabilidade",
  "Figuras de linguagem",
];

const convoLabel = (c: ConversationSummary) =>
  c.title || c.subject || "Conversa";

const dateLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Hoje";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

function SendArrow({ on }: { on: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      fill="none"
      viewBox="0 0 24 24"
      stroke={on ? "var(--color-bg)" : "currentColor"}
      strokeWidth="2.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 19V5M5 12l7-7 7 7"
      />
    </svg>
  );
}

export function TutorScreen({
  firstName,
  conversations,
  endpoint = "/api/tutor/chat",
}: {
  firstName: string;
  conversations: ConversationSummary[];
  /** /preview swaps in a canned stand-in (no model call). */
  endpoint?: string;
}) {
  const [view, setView] = useState<"home" | "chat">("home");
  const convos = conversations;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [reward, setReward] = useState<Reward | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string, convId: string | null) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "student", content: trimmed }]);
    setSending(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: trimmed }),
      });
      if (!res.ok) {
        throw new Error((await res.json())?.error ?? "Algo deu errado.");
      }
      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.reward?.awarded) setReward(data.reward);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setSending(false);
    }
  }

  function startNew(text: string) {
    if (!text.trim()) return;
    setTopic(text.trim());
    setConversationId(null);
    setMessages([]);
    setView("chat");
    send(text, null);
  }

  async function openConversation(c: ConversationSummary) {
    setDrawer(false);
    setTopic(convoLabel(c));
    setConversationId(c.id);
    setView("chat");
    setMessages([]);
    setSending(true);
    try {
      const res = await fetch(`/api/tutor/history?conversationId=${c.id}`);
      const data = await res.json();
      setMessages((data.messages ?? []) as Msg[]);
    } catch {
      setError("Não consegui carregar essa conversa.");
    } finally {
      setSending(false);
    }
  }

  // ────────────────────────────── CHAT ──────────────────────────────
  if (view === "chat") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2.5 border-b border-line bg-surface px-5 py-3.5">
          <button
            type="button"
            onClick={() => setView("home")}
            aria-label="Voltar"
            className="text-ink"
          >
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-aegean text-marble">
            <OwlIcon size={20} />
          </span>
          <div className="min-w-0">
            <div className="truncate font-display text-[14px] font-bold text-ink">
              {topic || "Tutor"}
            </div>
            <div className="text-[11px] text-muted">Coruja de Atena</div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          {sending && <Typing />}
          {error && <p className="text-sm font-medium text-weak">{error}</p>}
          {reward && (
            <p className="flex items-center justify-center gap-2 self-center rounded-full bg-ink px-4 py-2 text-sm font-bold text-gold animate-coin-pop">
              Sessão de estudo! +{reward.points} pts · +{reward.coins}{" "}
              <DrachmaCoin size={16} />
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-line bg-surface px-4 py-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input, conversationId);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Continue o raciocínio…"
              className="flex-1 rounded-[12px] border-2 border-mist bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-ink"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] ${
                input.trim() && !sending ? "bg-ink" : "bg-mist"
              }`}
            >
              <SendArrow on={!!input.trim() && !sending} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ────────────────────────────── HOME ──────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-2.5 pt-3.5">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Conversas anteriores"
          className="flex flex-col gap-1 p-1"
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-[2.5px] w-5 rounded bg-ink" />
          ))}
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-aegean text-marble">
            <OwlIcon size={18} />
          </span>
          <span className="font-display text-base text-ink">
            Coruja de Atena
          </span>
        </div>
        <span className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-1">
        <div className="mb-[18px] mt-1">
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">
            Olá{firstName ? `, ${firstName}` : ""}! 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            O que vamos aprender hoje?
          </p>
        </div>

        <div className="mb-4 mt-3.5 overflow-hidden rounded-[16px] border-2 border-mist bg-surface focus-within:border-ink">
          <form
            className="flex items-end gap-2 p-3 pl-4"
            onSubmit={(e) => {
              e.preventDefault();
              startNew(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida ou matéria…"
              className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] ${
                input.trim() ? "bg-ink" : "bg-mist-soft"
              }`}
            >
              <SendArrow on={!!input.trim()} />
            </button>
          </form>
        </div>

        <div className="mb-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
            Sugestões
          </p>
          <div className="flex flex-wrap gap-[7px]">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => startNew(s)}
                className="rounded-full border-[1.5px] border-mist bg-surface px-3.5 py-[7px] text-[13px] font-medium text-ink hover:border-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {convos.length > 0 && (
          <div className="mb-5">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                Recentes
              </p>
              <button
                type="button"
                onClick={() => setDrawer(true)}
                className="text-xs font-medium text-ink"
              >
                ver todas
              </button>
            </div>
            {convos.slice(0, 3).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openConversation(c)}
                className="mb-[7px] flex w-full items-center justify-between rounded-[12px] border-[1.5px] border-line bg-surface px-3.5 py-2.5 text-left"
              >
                <span className="truncate text-[13px] font-medium text-ink">
                  {convoLabel(c)}
                </span>
                <span className="ml-2 shrink-0 text-[11px] text-faint">
                  {dateLabel(c.updated_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {drawer && (
        <HistoryDrawer
          conversations={convos}
          onClose={() => setDrawer(false)}
          onSelect={openConversation}
        />
      )}
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const student = msg.role === "student";
  return (
    <div className={`flex ${student ? "justify-end" : "justify-start"}`}>
      {!student && (
        <span className="mr-2 grid h-7 w-7 shrink-0 self-end place-items-center rounded-full bg-aegean text-marble">
          <OwlIcon size={16} />
        </span>
      )}
      <div
        className={`max-w-[78%] whitespace-pre-wrap border-[1.5px] px-3.5 py-2.5 text-sm leading-relaxed text-ink ${
          student
            ? "rounded-[14px] rounded-br-[4px] border-gold-soft bg-parchment"
            : "rounded-[14px] rounded-bl-[4px] border-aegean-soft bg-aegean-soft"
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
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-aegean text-marble">
        <OwlIcon size={16} />
      </span>
      <div className="flex gap-1 rounded-[14px] rounded-bl-[4px] border-[1.5px] border-aegean-soft bg-aegean-soft px-4 py-2.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-ink/40" />
        ))}
      </div>
    </div>
  );
}

function HistoryDrawer({
  conversations,
  onClose,
  onSelect,
}: {
  conversations: ConversationSummary[];
  onClose: () => void;
  onSelect: (c: ConversationSummary) => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[50] bg-ink/20" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 z-[60] flex w-[240px] flex-col bg-surface shadow-[4px_0_24px_rgba(31,26,22,0.18)]">
        <div className="border-b border-line px-4 pb-4 pt-[52px]">
          <div className="font-display text-[15px] font-bold text-ink">
            Conversas anteriores
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 && (
            <p className="px-4 py-3 text-[13px] text-muted">
              Nenhuma conversa ainda.
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className="w-full border-b border-bg px-4 py-2.5 text-left"
            >
              <div className="mb-0.5 text-[11px] text-faint">
                {dateLabel(c.updated_at)}
              </div>
              <div className="text-[13px] font-medium leading-snug text-ink">
                {convoLabel(c)}
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-line p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[10px] bg-bg py-2.5 text-[13px] text-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}
