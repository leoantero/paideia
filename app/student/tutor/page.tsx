import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import {
  TutorScreen,
  type ConversationSummary,
} from "@/src/ui/student/TutorScreen";
import { getGamificationState } from "@/src/features/gamification/activity-service";
import type { GamificationState } from "@/src/ui/student/gamification-data";

// Ofensiva e moedas mudam a cada sessão — nunca servir esta tela de cache.
export const dynamic = "force-dynamic";

const EMPTY_STATE: GamificationState = {
  week: [false, false, false, false, false, false, false],
  todayIndex: 0,
  coins: 0,
  weekBonus: 20,
  streak: 0,
};

export default async function TutorPage() {
  const { supabase, user } = await getVerifiedUser();

  let conversations: ConversationSummary[] = [];
  let firstName = "";
  let gamification = EMPTY_STATE;

  if (user) {
    const [{ data: convs }, { data: prof }, state] = await Promise.all([
      // RLS já escopa para o aluno logado.
      supabase
        .from("conversations")
        .select("id, title, subject, updated_at")
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      getGamificationState(supabase, user.id),
    ]);
    conversations = (convs ?? []) as ConversationSummary[];
    firstName = (prof?.full_name ?? "").split(" ")[0] ?? "";
    gamification = state;
  }

  return (
    <TutorScreen
      firstName={firstName}
      conversations={conversations}
      gamification={gamification}
    />
  );
}
