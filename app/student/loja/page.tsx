import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { getGamificationState } from "@/src/features/gamification/activity-service";
import { LojaScreen } from "@/src/ui/student/LojaScreen";

export const dynamic = "force-dynamic";

export default async function LojaPage() {
  const { supabase, user } = await getVerifiedUser();

  const coins = user
    ? (await getGamificationState(supabase, user.id)).coins
    : 0;

  return <LojaScreen coins={coins} />;
}
