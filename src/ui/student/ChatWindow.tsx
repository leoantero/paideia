"use client";

import { useState } from "react";
import { MessageBubble, type DisplayMessage } from "@/src/ui/student/MessageBubble";
import { DrachmaCoin, OwlIcon } from "@/src/ui/paideia/icons";

interface ChatWindowProps {
  conversationId: string | null;
  initialMessages: DisplayMessage[];
  endpoint?: string;
}

/**
 * Deliberately simple: no streaming in Phase 1 (noted as a later
 * enhancement in the implementation plan). Optimistically appends the
 * student's own message, then appends the tutor's reply once it returns
 * from /api/tutor/chat — the only route holding the Anthropic key.
 */
export function ChatWindow({
  conversationId: initialConversationId,
  initialMessages,
  endpoint = "/api/tutor/chat",
}: ChatWindowProps) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<{ points: number; coins: number } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "student", content: text }]);
    setSending(true);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });

      if (!res.ok) {
        throw new Error((await res.json())?.error ?? "Algo deu errado.");
      }

      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.reward?.awarded) setReward({ points: data.reward.points, coins: data.reward.coins });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-1 flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line p-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-aegean text-marble">
              <OwlIcon size={32} />
            </span>
            <p className="font-display text-xl">Pergunte o que quiser</p>
            <p className="max-w-xs text-sm text-ink-soft">
              Eu não entrego respostas prontas: faço perguntas que te ajudam a descobrir sozinho.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {sending && <MessageBubble role="assistant" content="Pensando em uma boa pergunta…" />}
        {reward && (
          <p className="flex items-center justify-center gap-2 self-center rounded-full bg-ink px-4 py-2 text-sm font-bold text-gold animate-coin-pop">
            Conversa de estudo! +{reward.points} pts · +{reward.coins} <DrachmaCoin size={16} />
          </p>
        )}
      </div>

      {error && <p className="text-sm font-semibold text-terracotta">{error}</p>}

      <form onSubmit={handleSend} className="sticky bottom-28 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva sua dúvida…"
          className="min-w-0 flex-1 rounded-full border-2 border-line bg-surface px-5 py-3 outline-none focus:border-aegean"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-aegean px-5 font-extrabold text-marble disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
