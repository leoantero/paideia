import "server-only";
import type {
  Letter,
  QuestionOverview,
  ServedQuestion,
} from "@/src/features/questions/types";

/**
 * Questões de exemplo para o /preview. Escritas para o preview, no formato
 * das provas — não são itens reais do ENEM/SAEB/OBMEP (esses só entram pela
 * importação, com licença e revisão).
 */

interface Fixture extends ServedQuestion {
  correct_letter: Letter;
}

const C_POT = "c0000000-0000-0000-0000-000000000001";
const C_FRA = "c0000000-0000-0000-0000-000000000002";
const C_EQ = "c0000000-0000-0000-0000-000000000003";
const C_POR = "c0000000-0000-0000-0000-000000000004";
const C_EST = "c0000000-0000-0000-0000-000000000005";

const CONCEPTS: Record<string, string> = {
  [C_POT]: "Potências e notação científica",
  [C_FRA]: "Frações e números decimais",
  [C_EQ]: "Equações do 1º grau",
  [C_POR]: "Razão, proporção e porcentagem",
  [C_EST]: "Leitura de gráficos e tabelas",
};

let n = 0;
function q(
  concept: string,
  correct: Letter,
  stem: ServedQuestion["stem"],
  alternatives: string[]
): Fixture {
  n += 1;
  return {
    id: `f0000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
    origin: "enem",
    exam_label: "Exemplo · Paideia",
    exam_year: 2026,
    item_number: n,
    area: "matematica",
    subject: "math",
    concept_id: concept,
    concept_name: CONCEPTS[concept],
    stem,
    alternatives: alternatives.map((text, i) => ({
      letter: "ABCDE"[i] as Letter,
      text,
    })),
    source: { attribution: "questão de exemplo" },
    answered_before: false,
    correct_letter: correct,
  };
}

const text = (t: string) => ({ type: "text" as const, text: t });

export const PREVIEW_QUESTIONS: Fixture[] = [
  q(
    C_POT,
    "C",
    [text("Qual destes números é igual a 3,2 × 10⁴?")],
    ["320", "3 200", "32 000", "320 000"]
  ),
  q(
    C_EST,
    "D",
    [
      text(
        "Uma escola registrou, durante cinco semanas, quantos livros foram emprestados pela biblioteca. O gráfico mostra o total de empréstimos em cada semana."
      ),
      {
        type: "image",
        path: "/preview/questoes/grafico-biblioteca.svg",
        alt: "Gráfico de barras com empréstimos por semana: semana 1, 40 livros; semana 2, 55; semana 3, 35; semana 4, 70; semana 5, 50.",
        width: 640,
        height: 360,
      },
      text(
        "Em qual semana o número de empréstimos foi o dobro do registrado na semana 3?"
      ),
    ],
    ["Semana 1", "Semana 2", "Semana 3", "Semana 4", "Semana 5"]
  ),
  q(
    C_POR,
    "B",
    [
      text(
        "Uma cooperativa de agricultores familiares vende cestas de hortaliças por assinatura. No mês passado, 240 famílias assinavam a cesta. Depois de uma campanha na feira do bairro, em que os agricultores explicaram como a cesta é montada a cada semana com o que está na época de colheita, o número de assinantes passou a ser 300.\n\nA cooperativa quer divulgar o resultado da campanha no grupo de mensagens da comunidade, informando o aumento percentual no número de assinantes em relação ao mês anterior."
      ),
      text("Qual é o aumento percentual que deve ser divulgado?"),
    ],
    ["20%", "25%", "60%", "80%", "125%"]
  ),
  q(
    C_FRA,
    "A",
    [text("Qual fração representa o mesmo que 0,75?")],
    ["3/4", "7/5", "75/10", "1/75"]
  ),
  q(C_EQ, "C", [text("Se 3x + 5 = 20, quanto vale x?")], ["3", "4", "5", "15"]),
  q(
    C_POT,
    "B",
    [
      text(
        "A distância média da Terra ao Sol é de cerca de 150 000 000 km. Em notação científica, essa distância é:"
      ),
    ],
    ["1,5 × 10⁷ km", "1,5 × 10⁸ km", "15 × 10⁸ km", "1,5 × 10⁹ km"]
  ),
  q(
    C_FRA,
    "D",
    [
      text(
        "Ana comeu 2/8 de uma pizza e Bia comeu 1/4 da mesma pizza. O que é verdade?"
      ),
    ],
    [
      "Ana comeu mais",
      "Bia comeu mais",
      "Juntas comeram a pizza inteira",
      "As duas comeram a mesma quantidade",
    ]
  ),
  q(
    C_POR,
    "A",
    [
      text(
        "Uma receita usa 2 xícaras de farinha para 6 pessoas. Quantas xícaras são necessárias para 15 pessoas?"
      ),
    ],
    ["5", "4", "6", "7,5"]
  ),
  q(
    C_EQ,
    "B",
    [text("O dobro de um número, menos 7, é igual a 11. Que número é esse?")],
    ["2", "9", "18", "4"]
  ),
  q(C_POT, "D", [text("Quanto é 2³ × 2²?")], ["2⁶", "4⁵", "10", "32"]),
];

export function findPreviewQuestion(id: string): Fixture | undefined {
  return PREVIEW_QUESTIONS.find((f) => f.id === id);
}

export function previewQuestionSet(conceptId: string | null): ServedQuestion[] {
  return PREVIEW_QUESTIONS.filter(
    (f) => !conceptId || f.concept_id === conceptId
  ).map((f) => {
    const served: Partial<Fixture> = { ...f };
    delete served.correct_letter;
    return served as ServedQuestion;
  });
}

export const PREVIEW_QUESTION_OVERVIEW: QuestionOverview = {
  area: "matematica",
  areas: [
    { area: "matematica", total: PREVIEW_QUESTIONS.length },
    { area: "natureza", total: 0 },
    { area: "linguagens", total: 0 },
    { area: "humanas", total: 0 },
  ],
  total: PREVIEW_QUESTIONS.length,
  answered: 6,
  concepts: [
    {
      concept_id: C_POT,
      code: "EF09MA04",
      name: CONCEPTS[C_POT],
      subject: "math",
      total: 3,
      answered: 3,
      accuracy: 67,
    },
    {
      concept_id: C_FRA,
      code: "EF06MA07",
      name: CONCEPTS[C_FRA],
      subject: "math",
      total: 2,
      answered: 1,
      accuracy: 100,
    },
    {
      concept_id: C_EQ,
      code: "EF07MA18",
      name: CONCEPTS[C_EQ],
      subject: "math",
      total: 2,
      answered: 2,
      accuracy: 0,
    },
    {
      concept_id: C_POR,
      code: "EF07MA13",
      name: CONCEPTS[C_POR],
      subject: "math",
      total: 2,
      answered: 0,
      accuracy: null,
    },
    {
      concept_id: C_EST,
      code: "EF06MA32",
      name: CONCEPTS[C_EST],
      subject: "math",
      total: 1,
      answered: 0,
      accuracy: null,
    },
  ],
};
