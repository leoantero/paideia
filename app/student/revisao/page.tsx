import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { getReviewSubjects } from "@/src/features/spaced-repetition/review-service";
import { RevisaoScreen } from "@/src/ui/student/RevisaoScreen";

// O que está vencido muda a cada resposta — nunca servir esta tela de cache.
export const dynamic = "force-dynamic";

export default async function RevisaoPage() {
  const { supabase, user } = await getVerifiedUser();

  const subjects = user ? await getReviewSubjects(supabase, user.id) : [];

  return <RevisaoScreen subjects={subjects} />;
}
