"use client";

import { useState } from "react";
import { MessageBubble, type DisplayMessage } from "@/src/ui/student/MessageBubble";

interface ChatWindowProps {
  conversationId: string | null;
  initialMessages: DisplayMessage[];
}

/**
 * Deliberately simple: no streaming in Phase 1 (noted as a later
 * enhancement in the implementation plan). Optimistically appends the
 * student's own message, then appends the tutor's reply once it returns
 * from /api/tutor/chat — the only route holding the Anthropic key.
 */
export function ChatWindow({ conversationId: initialConversationId, initialMessages }: ChatWindowProps) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "student", content: text }]);
    setSending(true);

    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });

      if (!res.ok) {
        throw new Error((await res.json())?.error ?? "Something went wrong.");
      }

      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-md border border-gray-200 p-4 dark:border-gray-800">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">
            Ask me anything about what you're studying — I'll help you work through it.
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {sending && (
          <MessageBubble role="assistant" content="Thinking of a good question…" />
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Send
        </button>
      </form>
    </div>
  );
}
