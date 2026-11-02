import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { getQuestionSet } from "@/src/features/questions/question-service";
import {
  AREA_LABELS,
  QUESTION_AREAS,
  type QuestionArea,
} from "@/src/features/questions/types";
import { QuestionSession } from "@/src/ui/student/questions/QuestionSession";

// Cada visita sorteia uma sessão nova.
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function QuestionSessionPage({
  searchParams,
}: PageProps<"/student/questoes/sessao">) {
  const { area, conceito } = await searchParams;
  const selected: QuestionArea = QUESTION_AREAS.includes(area as QuestionArea)
    ? (area as QuestionArea)
    : "matematica";
  const conceptId =
    typeof conceito === "string" && UUID.test(conceito) ? conceito : null;

  const { supabase, user } = await getVerifiedUser();
  const [questions, { data: prof }] = await Promise.all([
    getQuestionSet(supabase, selected, conceptId),
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
  ]);

  const title =
    conceptId && questions[0]
      ? `${AREA_LABELS[selected]} · ${questions[0].concept_name}`
      : `Toda a ${AREA_LABELS[selected]}`;

  return (
    <QuestionSession
      questions={questions}
      title={title}
      backHref={`/student/questoes?area=${selected}`}
      firstName={(prof?.full_name ?? "").split(" ")[0] ?? ""}
    />
  );
}
