import { ChatWindow } from "@/src/ui/student/ChatWindow";

export default function PreviewTutor() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-aegean">Coruja de Atena</p>
        <h1 className="font-display text-3xl">Seu tutor</h1>
      </header>
      <ChatWindow
        conversationId={null}
        endpoint="/preview/api/chat"
        initialMessages={[
          { role: "student", content: "Por que a Lua muda de forma?" },
          {
            role: "assistant",
            content:
              "Ótima pergunta! Pense assim: a Lua tem luz própria, ou ela recebe luz de algum lugar? E se recebe, será que sempre vemos o mesmo lado iluminado?",
          },
        ]}
      />
    </div>
  );
}
