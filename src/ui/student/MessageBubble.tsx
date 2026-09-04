export interface DisplayMessage {
  role: "student" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: DisplayMessage) {
  const isStudent = role === "student";
  return (
    <div className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
          isStudent
            ? "bg-black text-white dark:bg-white dark:text-black"
            : "bg-gray-100 dark:bg-gray-800"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
