import { createClient } from "@/src/lib/supabase/server";
import { TutorScreen, type ConversationSummary } from "@/src/ui/student/TutorScreen";
import { PLACEHOLDER_GAMIFICATION } from "@/src/ui/student/gamification-data";

export default async function TutorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let conversations: ConversationSummary[] = [];
  let firstName = "";

  if (user) {
    const [{ data: convs }, { data: prof }] = await Promise.all([
      // RLS já escopa para o aluno logado.
      supabase
        .from("conversations")
        .select("id, title, subject, updated_at")
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    ]);
    conversations = (convs ?? []) as ConversationSummary[];
    firstName = (prof?.full_name ?? "").split(" ")[0] ?? "";
  }

  return (
    <TutorScreen
      firstName={firstName}
      conversations={conversations}
      gamification={PLACEHOLDER_GAMIFICATION}
    />
  );
}
