/**
 * Catálogo das simulações. Vive no código (não no banco) porque cada uma é
 * um componente; o banco só guarda a conclusão (simulation_completions).
 *
 * Cada simulação abre com uma pergunta-gancho da coruja e tem desafios que o
 * aluno descobre mexendo — a ideia é despertar curiosidade antes da conta.
 */

export type SimulationTone = "lamp" | "lavender" | "glauco" | "coral";

export interface SimulationChallenge {
  id: string;
  prompt: string;
}

export interface SimulationMeta {
  slug: string;
  title: string;
  description: string;
  grade: string;
  topic: string;
  subject: string;
  /** Códigos BNCC do conteúdo — contexto para o tutor. */
  bnccCodes: string[];
  tone: SimulationTone;
  hook: string;
  challenges: SimulationChallenge[];
}

export const SIMULATIONS: SimulationMeta[] = [
  {
    slug: "fracoes-pizza",
    title: "Frações com pizza",
    description:
      "Corte a pizza, pegue fatias e veja por que 2/4 e 4/8 são a mesma quantidade.",
    grade: "6º ano",
    topic: "Frações",
    subject: "math",
    bnccCodes: ["EF06MA07", "EF06MA08"],
    tone: "lamp",
    hook: "Cortar a pizza em mais pedaços faz ela render mais?",
    challenges: [
      {
        id: "meia-3-jeitos",
        prompt: "Pegue meia pizza de 3 jeitos diferentes.",
      },
      {
        id: "dois-tercos-tres-quartos",
        prompt: "Monte 2/3 e depois 3/4. Qual é mais pizza?",
      },
      { id: "inteira", prompt: "Pegue a pizza inteira cortada em 8." },
    ],
  },
  {
    slug: "termometro-elevador",
    title: "O termômetro e o elevador",
    description:
      "Por que −3 é menor que −1, e o que é subir 5 andares a partir do subsolo.",
    grade: "7º ano",
    topic: "Números negativos",
    subject: "math",
    bnccCodes: ["EF07MA03", "EF07MA04"],
    tone: "lavender",
    hook: "Se você está no 3º subsolo e sobe 5 andares, chega acima ou abaixo do térreo?",
    challenges: [
      { id: "subsolo-sobe-5", prompt: "Do andar −3, suba 5 andares." },
      {
        id: "menor-que-menos-1",
        prompt: "Desça para um andar menor que −1 e maior que −4.",
      },
      {
        id: "esfriou-4",
        prompt: "No termômetro: estava −2 °C e esfriou 4 graus.",
      },
    ],
  },
  {
    slug: "balanca-equacao",
    title: "A balança em equilíbrio",
    description:
      "Tire o mesmo peso dos dois pratos até descobrir quanto vale o x.",
    grade: "7º ano",
    topic: "Equações do 1º grau",
    subject: "math",
    bnccCodes: ["EF07MA18"],
    tone: "glauco",
    hook: "Dá para descobrir o peso da caixa misteriosa sem abrir a caixa?",
    challenges: [
      {
        id: "desequilibrar",
        prompt: "Tire peso de um lado só e veja o que acontece.",
      },
      { id: "resolver-1", prompt: "Descubra o x da primeira balança." },
      { id: "resolver-3", prompt: "Descubra o x das três balanças." },
    ],
  },
  {
    slug: "receita-proporcao",
    title: "A receita que cresce",
    description:
      "Dobrar a receita dobra cada ingrediente na mesma proporção. Daí vem a porcentagem.",
    grade: "7º ano",
    topic: "Razão e proporção",
    subject: "math",
    bnccCodes: ["EF07MA09", "EF07MA17"],
    tone: "coral",
    hook: "Se a festa tiver o dobro de gente, você precisa do dobro de forno?",
    challenges: [
      { id: "dobro", prompt: "Faça a receita em dobro (200%)." },
      { id: "metade", prompt: "Faça meia receita." },
      {
        id: "cinco-xicaras",
        prompt: "Para quantas pessoas dá com 5 xícaras de farinha?",
      },
    ],
  },
  {
    slug: "barbante-cercado",
    title: "O mesmo barbante, cercados diferentes",
    description: "Com o mesmo perímetro dá para cercar áreas bem diferentes.",
    grade: "6º e 7º ano",
    topic: "Área e perímetro",
    subject: "math",
    bnccCodes: ["EF06MA29", "EF07MA31"],
    tone: "glauco",
    hook: "Com 24 metros de cerca, qual é a maior horta que você consegue fazer?",
    challenges: [
      { id: "area-20", prompt: "Faça um cercado com 20 m² de área." },
      { id: "mais-fino", prompt: "Faça o cercado mais fininho possível." },
      { id: "maior-area", prompt: "Encontre o cercado de maior área." },
    ],
  },
];

export function findSimulation(slug: string): SimulationMeta | undefined {
  return SIMULATIONS.find((s) => s.slug === slug);
}
