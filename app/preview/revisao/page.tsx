import { DeckFilter } from "@/src/ui/student/DeckFilter";
import { StudySession } from "@/src/ui/student/StudySession";
import {
  PREVIEW_DECK_OVERVIEW,
  previewQueue,
} from "@/src/ui/student/preview/fixtures";

export default async function PreviewRevisao({
  searchParams,
}: PageProps<"/preview/revisao">) {
  const { deck } = await searchParams;
  const deckId = typeof deck === "string" ? deck : null;
  return (
    <div className="flex flex-col gap-8">
      <StudySession
        key={deckId ?? "all"}
        basePath="/preview"
        initialQueue={previewQueue(deckId)}
        reviewEndpoint="/preview/api/review"
        openEndpoint="/preview/api/open"
      />
      <DeckFilter
        decks={PREVIEW_DECK_OVERVIEW}
        activeDeckId={deckId}
        basePath="/preview"
      />
    </div>
  );
}
