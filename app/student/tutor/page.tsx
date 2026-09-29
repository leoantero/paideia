import { createClient } from "@/src/lib/supabase/server";
import { ChatWindow } from "@/src/ui/student/ChatWindow";
import type { DisplayMessage } from "@/src/ui/student/MessageBubble";

export default async function TutorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let conversationId: string | null = null;
  let initialMessages: DisplayMessage[] = [];

  if (user) {
    // RLS scopes this to the signed-in student automatically — no manual
    // student_id filter needed (see src/features/tutoring/conversation-service.ts).
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conversation) {
      conversationId = conversation.id;
      const { data: messages } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

      initialMessages = (messages ?? []) as DisplayMessage[];
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-aegean">Coruja de Atena</p>
        <h1 className="font-display text-3xl">Seu tutor</h1>
      </header>
      <ChatWindow conversationId={conversationId} initialMessages={initialMessages} />
    </div>
  );
}
