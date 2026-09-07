/**
 * Baralhos de revisão — PLACEHOLDER.
 *
 * O conteúdo real (baralhos da turma + cards criados pelo aluno) e o
 * agendamento SM-2 são back-end da fase 7; cada resposta de revisão vira
 * evidência (`retrieval_review`) no learning graph. Até lá, este é o
 * conteúdo-semente que veio do protótipo do Figma.
 */

export interface AnkiCard {
  front: string;
  back: string;
}

export interface DeckContent {
  name: string;
  cards: number;
  due: number;
  ankiCards: AnkiCard[];
}

export interface Subject {
  name: string;
  color: string;
  bg: string;
  icon: string;
  totalCards: number;
  dueCards: number;
  contents: DeckContent[];
}

export const SUBJECTS: Subject[] = [
  {
    name: "Matemática",
    color: "#1e3a8a",
    bg: "#e8f0fb",
    icon: "📐",
    totalCards: 18,
    dueCards: 5,
    contents: [
      {
        name: "Equações 2º grau",
        cards: 8,
        due: 3,
        ankiCards: [
          {
            front: "O que é uma equação do 2º grau?",
            back: "Polinômio de grau 2: ax² + bx + c = 0, com a ≠ 0. Pode ter 0, 1 ou 2 raízes reais.",
          },
          {
            front: "Fórmula de Bhaskara",
            back: "x = (−b ± √Δ) / 2a, onde Δ = b² − 4ac (discriminante).",
          },
          {
            front: "Quando Δ < 0?",
            back: "A equação não tem raízes reais — as raízes são complexas.",
          },
        ],
      },
      {
        name: "Funções afins",
        cards: 6,
        due: 2,
        ankiCards: [
          {
            front: "Defina função afim.",
            back: "f(x) = ax + b, a ≠ 0. Gráfico é sempre uma reta. \"a\" é a taxa de variação e \"b\" é o ponto de intersecção com o eixo Y.",
          },
          {
            front: "Quando uma função afim é crescente?",
            back: "Quando a > 0 — a reta tem inclinação positiva.",
          },
        ],
      },
      {
        name: "Frações e decimais",
        cards: 4,
        due: 0,
        ankiCards: [
          {
            front: "Como converter 3/4 em decimal?",
            back: "3 ÷ 4 = 0,75. Divide numerador pelo denominador.",
          },
        ],
      },
    ],
  },
  {
    name: "Português",
    color: "#b8960a",
    bg: "#fdf8e1",
    icon: "📝",
    totalCards: 14,
    dueCards: 2,
    contents: [
      {
        name: "Figuras de linguagem",
        cards: 7,
        due: 2,
        ankiCards: [
          {
            front: "O que é onomatopeia?",
            back: "Palavra que imita um som. Ex: \"miau\", \"au-au\", \"tic-tac\".",
          },
          {
            front: "Diferença entre metáfora e metonímia?",
            back: "Metáfora: comparação implícita (\"ele é uma pedra\"). Metonímia: troca por relação lógica (\"ler Machado de Assis\").",
          },
        ],
      },
      {
        name: "Morfologia",
        cards: 4,
        due: 0,
        ankiCards: [
          {
            front: "Quais são as classes de palavras?",
            back: "Substantivo, adjetivo, verbo, advérbio, pronome, artigo, numeral, preposição, conjunção e interjeição.",
          },
        ],
      },
    ],
  },
  {
    name: "Física",
    color: "#2d7a4f",
    bg: "#e5f5ed",
    icon: "⚡",
    totalCards: 10,
    dueCards: 1,
    contents: [
      {
        name: "Cinemática",
        cards: 5,
        due: 1,
        ankiCards: [
          {
            front: "Fórmula da velocidade média",
            back: "v = Δs / Δt — variação do espaço dividida pela variação do tempo.",
          },
        ],
      },
      {
        name: "Dinâmica",
        cards: 5,
        due: 0,
        ankiCards: [
          {
            front: "2ª Lei de Newton",
            back: "F = m·a — força resultante é igual à massa vezes a aceleração. Unidade: Newton (N).",
          },
        ],
      },
    ],
  },
  {
    name: "História",
    color: "#8b4513",
    bg: "#f9ede3",
    icon: "📜",
    totalCards: 9,
    dueCards: 4,
    contents: [
      {
        name: "Revolução Francesa",
        cards: 5,
        due: 3,
        ankiCards: [
          {
            front: "Quais os três lemas da Revolução Francesa?",
            back: "Liberdade, Igualdade e Fraternidade.",
          },
          {
            front: "Quando ocorreu a Revolução Francesa?",
            back: "Entre 1789 e 1799. Marco inicial: a tomada da Bastilha em 14 de julho de 1789.",
          },
        ],
      },
      {
        name: "Idade Média",
        cards: 4,
        due: 1,
        ankiCards: [
          {
            front: "O que é feudalismo?",
            back: "Sistema político, econômico e social da Idade Média baseado na posse de terras (feudo) e nas relações de vassalagem.",
          },
        ],
      },
    ],
  },
  {
    name: "Biologia",
    color: "#1a7a8a",
    bg: "#e3f4f6",
    icon: "🌿",
    totalCards: 7,
    dueCards: 0,
    contents: [
      {
        name: "Citologia",
        cards: 4,
        due: 0,
        ankiCards: [
          {
            front: "Diferença entre célula procarionte e eucarionte?",
            back: "Procarionte: sem núcleo definido (bactérias). Eucarionte: com núcleo organizado por membrana nuclear.",
          },
        ],
      },
    ],
  },
  {
    name: "Química",
    color: "#6a2d7a",
    bg: "#f3e8fb",
    icon: "🧪",
    totalCards: 8,
    dueCards: 2,
    contents: [
      {
        name: "Tabela periódica",
        cards: 4,
        due: 2,
        ankiCards: [
          {
            front: "O que são elementos do mesmo período?",
            back: "Elementos na mesma linha horizontal da tabela periódica. Têm o mesmo número de camadas eletrônicas.",
          },
        ],
      },
    ],
  },
];
