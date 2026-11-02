import { PREVIEW_QUESTION_OVERVIEW } from "@/src/ui/student/preview/question-fixtures";
import {
  QUESTION_AREAS,
  type QuestionArea,
} from "@/src/features/questions/types";
import { QuestoesView } from "@/src/ui/student/questions/QuestoesView";

export default async function PreviewQuestoes({
  searchParams,
}: PageProps<"/preview/questoes">) {
  const { area } = await searchParams;
  const selected: QuestionArea = QUESTION_AREAS.includes(area as QuestionArea)
    ? (area as QuestionArea)
    : "matematica";
  const overview =
    selected === "matematica"
      ? PREVIEW_QUESTION_OVERVIEW
      : {
          ...PREVIEW_QUESTION_OVERVIEW,
          area: selected,
          total: 0,
          answered: 0,
          concepts: [],
        };
  return <QuestoesView overview={overview} basePath="/preview" />;
}
