import { createClient } from "@/src/lib/supabase/server";
import { getClassLeaderboard, getMyProgress } from "@/src/features/gamification/gamification-service";
import { ArenaView } from "@/src/ui/student/ArenaView";

export default async function ArenaPage({ searchParams }: PageProps<"/student/arena">) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const [leaderboard, progress] = await Promise.all([getClassLeaderboard(supabase), getMyProgress(supabase)]);

  return (
    <ArenaView leaderboard={leaderboard} progress={progress} initialTab={tab === "loja" ? "loja" : "ranking"} />
  );
}
