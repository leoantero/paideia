import { OwlIcon } from "@/src/ui/paideia/icons";

export interface DisplayMessage {
  role: "student" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: DisplayMessage) {
  if (role === "student") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-ink px-4 py-2.5 text-[15px] text-marble">
          {content}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aegean text-marble">
        <OwlIcon size={18} />
      </span>
      <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5 text-[15px]">
        {content}
      </p>
    </div>
  );
}
