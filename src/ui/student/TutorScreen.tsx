"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RichText } from "@/src/ui/RichText";
import {
  ArrowRightIcon,
  CoinDot,
  MenuIcon,
  OwlLineIcon,
  PlusIcon,
} from "@/src/ui/paideia/line-icons";

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
  if (d.toDateString() === today.toDateString()) return "Hoje";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

/**
 * Tutor socrático (prancha `TelaTutor`). Uma tela só: a conversa aberta, ou,
 * sem conversa, sugestões e conversas recentes. O histórico completo abre
 * numa gaveta.
 */
export function TutorScreen({
  firstName,
  conversations,
  endpoint = "/api/tutor/chat",
  initialQuestion,
  initialConversationId,
}: {
  firstName: string;
  conversations: ConversationSummary[];
  /** /preview swaps in a canned stand-in (no model call). */
  endpoint?: string;
  /** Pergunta vinda do Início (`?q=`): abre uma conversa nova com ela. */
  initialQuestion?: string;
  /** Conversa vinda do Início (`?c=`): reabre essa conversa. */
  initialConversationId?: string;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [reward, setReward] = useState<Reward | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

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

  function startNew() {
    setConversationId(null);
    setMessages([]);
    setReward(null);
    setError(null);
  }

  async function openConversation(id: string) {
    setDrawer(false);
    setConversationId(id);
    setMessages([]);
    setReward(null);
    setSending(true);
    try {
      const res = await fetch(`/api/tutor/history?conversationId=${id}`);
      const data = await res.json();
      setMessages((data.messages ?? []) as Msg[]);
    } catch {
      setError("Não consegui carregar essa conversa.");
    } finally {
      setSending(false);
    }
  }

  // Vindo do Início: abre a conversa pedida ou começa uma com a pergunta.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Fora do corpo do efeito: é uma chamada de rede, não sincronização de estado.
    void Promise.resolve().then(() => {
      if (initialConversationId) openConversation(initialConversationId);
      else if (initialQuestion) send(initialQuestion, null);
    });
    // Só na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const empty = messages.length === 0 && !sending;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] leading-tight">Seu tutor</h1>
          <p className="text-sm leading-[1.45] text-muted">
            Ele não entrega a resposta. Faz perguntas até você chegar lá.
          </p>
        </div>
        <div className="-mr-2 flex shrink-0">
          {!empty && (
            <button
              type="button"
              onClick={startNew}
              aria-label="Nova conversa"
              className="grid h-11 w-11 place-items-center text-muted hover:text-ink"
            >
              <PlusIcon size={21} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Conversas anteriores"
            className="grid h-11 w-11 place-items-center text-muted hover:text-ink"
          >
            <MenuIcon size={21} />
          </button>
        </div>
      </div>

      <div className="-mx-5 mt-5 flex-1 overflow-y-auto px-5 pb-4">
        {empty ? (
          <EmptyState
            conversations={conversations}
            onSuggestion={(s) => send(s, null)}
            onOpen={openConversation}
            onAll={() => setDrawer(true)}
          />
        ) : (
          <ol className="flex flex-col gap-[18px]">
            {messages.map((m, i) =>
              m.role === "student" ? (
                <StudentLine key={i} name={firstName || "Você"}>
                  {m.content}
                </StudentLine>
              ) : (
                <TutorLine key={i}>
                  <HighlightLastQuestion text={m.content} />
                </TutorLine>
              )
            )}
            {sending && (
              <TutorLine>
                <span className="flex gap-1 py-2" aria-label="Pensando">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-glauco-mid"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
              </TutorLine>
            )}
            {reward && (
              <li className="flex items-center gap-2 border-t border-dashed border-input pt-3 text-[13px] text-muted animate-coin-pop">
                <CoinDot size={14} />+{reward.points} pts e +{reward.coins}{" "}
                dracmas por estudar conversando.
              </li>
            )}
          </ol>
        )}
        {error && (
          <p className="mt-3 text-sm font-medium text-coral-ink">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input, conversationId);
        }}
      >
        <label htmlFor="duvida-tutor" className="sr-only">
          Sua resposta ou dúvida
        </label>
        <input
          id="duvida-tutor"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={empty ? "Escreva sua dúvida" : "Responda ou pergunte"}
          className="h-12 min-w-0 flex-1 rounded-sm border-[1.5px] border-input bg-surface px-3.5 text-[15px] text-ink placeholder:text-faint focus:border-night focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!input.trim() || sending}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-night text-on-night disabled:opacity-40"
        >
          <ArrowRightIcon size={22} />
        </button>
      </form>

      {drawer && (
        <HistoryDrawer
          conversations={conversations}
          onClose={() => setDrawer(false)}
          onSelect={(c) => openConversation(c.id)}
        />
      )}
    </div>
  );
}

function StudentLine({ name, children }: { name: string; children: string }) {
  return (
    <li className="flex flex-col items-end gap-1">
      <span className="text-xs font-bold text-lavender-ink">{name}</span>
      <p className="max-w-[82%] whitespace-pre-wrap rounded-[12px_2px_12px_12px] bg-lavender px-3.5 py-2.5 text-[15px] leading-[1.45] text-on-lavender">
        {children}
      </p>
    </li>
  );
}

function TutorLine({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-panel text-glauco">
        <OwlLineIcon size={17} strokeWidth={1.9} />
      </span>
      <div className="flex max-w-[86%] flex-col gap-[3px]">
        <span className="text-xs font-bold text-glauco-deep">Tutor</span>
        <div className="whitespace-pre-wrap text-[15px] leading-[1.55]">
          {children}
        </div>
      </div>
    </li>
  );
}

/**
 * Destaca a última pergunta do tutor, a que o aluno precisa responder. Só
 * destaca quando o corte não quebra um negrito/itálico ao meio.
 */
function HighlightLastQuestion({ text }: { text: string }) {
  const q = text.lastIndexOf("?");
  if (q === -1) return <RichText text={text} />;
  const head = text.slice(0, q);
  const start =
    Math.max(
      head.lastIndexOf(". "),
      head.lastIndexOf("! "),
      head.lastIndexOf("? "),
      head.lastIndexOf("\n")
    ) + 1;
  const before = text.slice(0, start);
  const question = text.slice(start, q + 1).trimStart();
  const after = text.slice(q + 1);
  const balanced = (s: string) => (s.match(/\*/g)?.length ?? 0) % 2 === 0;
  if (question.length > 240 || !balanced(before) || !balanced(question)) {
    return <RichText text={text} />;
  }
  return (
    <>
      <RichText text={before} />
      {before && !before.endsWith(" ") && !before.endsWith("\n") ? " " : null}
      <mark className="rounded-[3px] bg-glauco-soft px-[3px] py-px text-inherit">
        <RichText text={question} />
      </mark>
      <RichText text={after} />
    </>
  );
}

function EmptyState({
  conversations,
  onSuggestion,
  onOpen,
  onAll,
}: {
  conversations: ConversationSummary[];
  onSuggestion: (s: string) => void;
  onOpen: (id: string) => void;
  onAll: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2.5">
        <h2 className="text-lg">Por onde começar</h2>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestion(s)}
              className="min-h-11 rounded-full bg-surface px-4 text-[14px] font-semibold text-ink ring-1 ring-line-strong hover:ring-night"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {conversations.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg">Conversas recentes</h2>
            <button
              type="button"
              onClick={onAll}
              className="text-[13px] font-bold text-glauco-deep"
            >
              Ver todas
            </button>
          </div>
          <ul className="flex flex-col rounded-lg bg-surface">
            {conversations.slice(0, 3).map((c, i) => (
              <li key={c.id} className={i > 0 ? "border-t border-line" : ""}>
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                    {convoLabel(c)}
                  </span>
                  <span className="shrink-0 text-[13px] text-muted">
                    {dateLabel(c.updated_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
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
      <div
        className="fixed inset-0 z-[50] bg-panel/30"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Conversas anteriores"
        className="fixed inset-y-0 left-0 z-[60] flex w-[260px] flex-col bg-surface shadow-[4px_0_24px_rgba(28,42,74,0.18)]"
      >
        <div className="border-b border-line px-4 pb-4 pt-12">
          <h2 className="text-lg">Conversas anteriores</h2>
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
              className="w-full border-b border-line px-4 py-3 text-left"
            >
              <div className="mb-0.5 text-xs text-muted">
                {dateLabel(c.updated_at)}
              </div>
              <div className="text-sm font-semibold leading-snug">
                {convoLabel(c)}
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-line p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-sm bg-bg text-sm font-semibold text-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}
