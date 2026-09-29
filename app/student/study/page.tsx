import { createClient } from "@/src/lib/supabase/server";
import { getDeckOverview, getStudyQueue } from "@/src/features/spaced-repetition/study-service";
import { StudySession } from "@/src/ui/student/StudySession";
import { DeckFilter } from "@/src/ui/student/DeckFilter";

export default async function StudyPage({ searchParams }: PageProps<"/student/study">) {
  const { deck } = await searchParams;
  const deckId = typeof deck === "string" ? deck : null;
  const supabase = await createClient();

  const [queue, decks] = await Promise.all([getStudyQueue(supabase, deckId), getDeckOverview(supabase)]);

  return (
    <div className="flex flex-col gap-5">
      <DeckFilter decks={decks} activeDeckId={deckId} basePath="/student" />
      <StudySession key={deckId ?? "all"} initialQueue={queue} />
    </div>
  );
}
