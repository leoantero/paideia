export interface DisplayMessage {
  role: "student" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: DisplayMessage) {
  const isStudent = role === "student";
  return (
    <div className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
      {!isStudent && (
        <span
          aria-hidden
          className="mr-2 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-gold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Π
        </span>
      )}
      <div
        className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isStudent
            ? "rounded-br-sm bg-ink text-white"
            : "rounded-bl-sm bg-mist-soft text-body"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
