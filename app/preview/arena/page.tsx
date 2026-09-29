import { ArenaView } from "@/src/ui/student/ArenaView";
import { PREVIEW_LEADERBOARD, PREVIEW_PROGRESS } from "@/src/ui/student/preview/fixtures";

export default async function PreviewArena({ searchParams }: PageProps<"/preview/arena">) {
  const { tab } = await searchParams;
  return (
    <ArenaView
      leaderboard={PREVIEW_LEADERBOARD}
      progress={PREVIEW_PROGRESS}
      initialTab={tab === "loja" ? "loja" : "ranking"}
      freezeEndpoint="/preview/api/freeze"
    />
  );
}
