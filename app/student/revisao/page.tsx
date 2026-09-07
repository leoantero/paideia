import { createClient } from "@/src/lib/supabase/server";
import { getReviewSubjects } from "@/src/features/spaced-repetition/review-service";
import { RevisaoScreen } from "@/src/ui/student/RevisaoScreen";

// O que está vencido muda a cada resposta — nunca servir esta tela de cache.
export const dynamic = "force-dynamic";

export default async function RevisaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const subjects = user ? await getReviewSubjects(supabase, user.id) : [];

  return <RevisaoScreen subjects={subjects} />;
}
