import { HomeView } from "@/src/ui/student/HomeView";
import {
  PREVIEW_DECK_OVERVIEW,
  PREVIEW_LEADERBOARD,
  PREVIEW_PROGRESS,
} from "@/src/ui/student/preview/fixtures";

export default function PreviewHome() {
  return (
    <HomeView
      basePath="/preview"
      firstName="Ana"
      today={new Date()}
      progress={PREVIEW_PROGRESS}
      myRank={PREVIEW_LEADERBOARD.entries.find((e) => e.is_me) ?? null}
      classroomName={PREVIEW_LEADERBOARD.classroom?.name ?? null}
      decks={PREVIEW_DECK_OVERVIEW}
    />
  );
}
