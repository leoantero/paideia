import { requireRole } from "@/src/core/auth/require-role";
import { createClient } from "@/src/lib/supabase/server";
import { getClassLeaderboard, getMyProgress } from "@/src/features/gamification/gamification-service";
import { getDeckOverview } from "@/src/features/spaced-repetition/study-service";
import { HomeView } from "@/src/ui/student/HomeView";

export default async function StudentHomePage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const [progress, leaderboard, decks] = await Promise.all([
    getMyProgress(supabase),
    getClassLeaderboard(supabase),
    getDeckOverview(supabase),
  ]);

  return (
    <HomeView
      firstName={profile.full_name?.split(" ")[0] ?? "estudante"}
      today={new Date()}
      progress={progress}
      myRank={leaderboard.entries.find((e) => e.is_me) ?? null}
      classroomName={leaderboard.classroom?.name ?? null}
      decks={decks}
    />
  );
}
