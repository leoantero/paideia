import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import {
  getClassLeaderboard,
  getMyProgress,
} from "@/src/features/gamification/gamification-service";
import { ArenaView } from "@/src/ui/student/ArenaView";

export const dynamic = "force-dynamic";

export default async function PodioPage({
  searchParams,
}: PageProps<"/student/podio">) {
  const { tab } = await searchParams;
  const { supabase } = await getVerifiedUser();
  const [leaderboard, progress] = await Promise.all([
    getClassLeaderboard(supabase),
    getMyProgress(supabase),
  ]);

  return (
    <ArenaView
      leaderboard={leaderboard}
      progress={progress}
      initialTab={tab === "loja" ? "loja" : "ranking"}
    />
  );
}
