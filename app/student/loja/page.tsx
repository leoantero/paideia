import { createClient } from "@/src/lib/supabase/server";
import { getGamificationState } from "@/src/features/gamification/activity-service";
import { LojaScreen } from "@/src/ui/student/LojaScreen";

export const dynamic = "force-dynamic";

export default async function LojaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const coins = user
    ? (await getGamificationState(supabase, user.id)).coins
    : 0;

  return <LojaScreen coins={coins} />;
}
