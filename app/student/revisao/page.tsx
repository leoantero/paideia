import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import {
  getDeckOverview,
  getStudyQueue,
} from "@/src/features/spaced-repetition/study-service";
import { StudySession } from "@/src/ui/student/StudySession";
import { DeckFilter } from "@/src/ui/student/DeckFilter";

// O que está vencido muda a cada resposta — nunca servir esta tela de cache.
export const dynamic = "force-dynamic";

export default async function RevisaoPage({
  searchParams,
}: PageProps<"/student/revisao">) {
  const { deck } = await searchParams;
  const deckId = typeof deck === "string" ? deck : null;
  const { supabase } = await getVerifiedUser();

  const [queue, decks] = await Promise.all([
    getStudyQueue(supabase, deckId),
    getDeckOverview(supabase),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <DeckFilter decks={decks} activeDeckId={deckId} basePath="/student" />
      <StudySession key={deckId ?? "all"} initialQueue={queue} />
    </div>
  );
}
