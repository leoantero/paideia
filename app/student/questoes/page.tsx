import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { getQuestionOverview } from "@/src/features/questions/question-service";
import {
  QUESTION_AREAS,
  type QuestionArea,
} from "@/src/features/questions/types";
import { QuestoesView } from "@/src/ui/student/questions/QuestoesView";

export const dynamic = "force-dynamic";

export default async function QuestoesPage({
  searchParams,
}: PageProps<"/student/questoes">) {
  const { area } = await searchParams;
  const selected: QuestionArea = QUESTION_AREAS.includes(area as QuestionArea)
    ? (area as QuestionArea)
    : "matematica";
  const { supabase } = await getVerifiedUser();
  const overview = await getQuestionOverview(supabase, selected);

  return <QuestoesView overview={overview} />;
}
