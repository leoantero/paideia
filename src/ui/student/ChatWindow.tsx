"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble, type DisplayMessage } from "@/src/ui/student/MessageBubble";
import { Button, ErrorText } from "@/src/ui/kit";

interface ChatWindowProps {
  conversationId: string | null;
  initialMessages: DisplayMessage[];
}

const STARTERS = [
  "Help me understand fractions",
  "Why is the sky blue?",
  "I'm stuck on this equation",
];

/**
 * Deliberately simple: no streaming in Phase 1 (noted as a later enhancement
 * in the implementation plan). Optimistically appends the student's message,
 * then appends the tutor's reply from /api/tutor/chat — the only route
 * holding the Anthropic key.
 */
export function ChatWindow({
  conversationId: initialConversationId,
  initialMessages,
}: ChatWindowProps) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "student", content: trimmed }]);
    setSending(true);

    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
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
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-[var(--radius)] border border-line bg-surface p-4"
      >
        {empty ? (
          <div className="m-auto flex max-w-sm flex-col items-center gap-4 py-8 text-center">
            <span
              aria-hidden
              className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-lg font-semibold text-gold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Π
            </span>
            <p className="text-sm text-muted">
              Ask about anything you&apos;re studying. I won&apos;t just give you the
              answer — I&apos;ll help you get there yourself.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-mist-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))
        )}
        {sending && (
          <MessageBubble role="assistant" content="Thinking of a good question…" />
        )}
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type your question…  (Enter to send, Shift+Enter for a new line)"
          className="max-h-32 flex-1 resize-none rounded-[var(--radius)] border border-line bg-surface px-3.5 py-2.5 text-sm text-body placeholder:text-muted focus:border-ink"
        />
        <Button type="submit" disabled={sending || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
