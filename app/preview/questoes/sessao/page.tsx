import { previewQuestionSet } from "@/src/ui/student/preview/question-fixtures";
import { QuestionSession } from "@/src/ui/student/questions/QuestionSession";

export default async function PreviewQuestionSession({
  searchParams,
}: PageProps<"/preview/questoes/sessao">) {
  const { conceito } = await searchParams;
  const questions = previewQuestionSet(
    typeof conceito === "string" ? conceito : null
  );
  return (
    <QuestionSession
      questions={questions}
      title={
        typeof conceito === "string" && questions[0]
          ? `Matemática · ${questions[0].concept_name}`
          : "Toda a Matemática"
      }
      backHref="/preview/questoes"
      firstName="Ana"
      endpoints={{
        answer: "/preview/api/question-answer",
        reveal: "/preview/api/question-reveal",
        tutor: "/preview/api/question-tutor",
      }}
    />
  );
}
