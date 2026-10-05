import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import {
  TutorScreen,
  type ConversationSummary,
} from "@/src/ui/student/TutorScreen";

export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const { supabase, user } = await getVerifiedUser();

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

  // Altura fixa: o chat rola por dentro e a caixa de texto fica sempre à vista
  // acima da barra de navegação.
  return (
    <div className="flex h-[calc(100dvh-12.5rem)] min-h-[420px] flex-col overflow-hidden rounded-3xl border border-line bg-surface">
      <TutorScreen firstName={firstName} conversations={conversations} />
    </div>
  );
}
