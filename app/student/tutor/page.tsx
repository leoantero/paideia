import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import {
  TutorScreen,
  type ConversationSummary,
} from "@/src/ui/student/TutorScreen";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TutorPage({
  searchParams,
}: PageProps<"/student/tutor">) {
  const { q, c } = await searchParams;
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

  // `?q=` e `?c=` vêm do Início. A conversa só abre se for do aluno: a rota
  // /api/tutor/history passa pela RLS.
  const question = typeof q === "string" ? q.slice(0, 2000) : undefined;
  const convId = typeof c === "string" && UUID.test(c) ? c : undefined;

  // Altura fixa: o chat rola por dentro e a caixa de texto fica logo acima da
  // barra de navegação (o -mb desconta parte do respiro da casca).
  return (
    <div className="-mb-6 flex h-[calc(100dvh-156px)] min-h-[420px] flex-col">
      <TutorScreen
        firstName={firstName}
        conversations={conversations}
        initialQuestion={question}
        initialConversationId={convId}
      />
    </div>
  );
}
