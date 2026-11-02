import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { admin } from "../lib/admin";
import { rawDirFor, type ExtractedQuestion } from "./enem-shared";

config({ path: ".env.local" });

/**
 * Etiqueta questões extraídas do ENEM com Claude: concept_id do grafo, série,
 * dificuldade, e um stem/alternatives LIMPOS (a extração de PDF quebra
 * fórmulas — frações e expoentes viram texto solto sem estrutura — então
 * aqui o modelo também reescreve o enunciado em prosa normal, nunca inventa
 * conteúdo). Roda fora do caminho crítico (script de importação em lote), por
 * isso usa o modelo do Construtor (sonnet), não o do tutor.
 *
 * Só matemática por ora (único grafo com cobertura completa). Grava em
 * pending_review — nada fica visível ao aluno antes de review-enem.ts.
 *
 * Uso: npx tsx scripts/questions/tag-enem.ts <ano>
 */

const MODEL = "claude-sonnet-4-5";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface Concept {
  id: string;
  code: string;
  name: string;
  grade_year: number | null;
}

interface TaggedQuestion extends ExtractedQuestion {
  concept_id: string | null;
  concept_code: string | null;
  grade_year: number | null;
  difficulty: number;
  needs_image: boolean;
  stem_text: string;
  alternatives: Record<string, string>;
  tagger_confidence: number;
  tagger_notes: string;
}

const tagTool: Anthropic.Tool = {
  name: "tag_question",
  description: "Classifica e limpa uma questão do ENEM.",
  input_schema: {
    type: "object",
    properties: {
      stem_text: {
        type: "string",
        description:
          "Enunciado reescrito em prosa normal, sem o ruído da extração de PDF. Preserve todo o conteúdo e números originais, só corrija a formatação quebrada.",
      },
      alternatives: {
        type: "object",
        description: "As 5 alternativas (chaves A-E), texto limpo.",
        properties: {
          A: { type: "string" },
          B: { type: "string" },
          C: { type: "string" },
          D: { type: "string" },
          E: { type: "string" },
        },
        required: ["A", "B", "C", "D", "E"],
      },
      needs_image: {
        type: "boolean",
        description:
          "true se a questão depende de uma figura/gráfico/tabela que não pode ser reconstruída só com texto (ou seja, o enunciado fica incompleto sem a imagem original).",
      },
      concept_id: {
        type: "string",
        description:
          "id do conceito da lista mais específico que esta questão cobra. null se nenhum da lista encaixa.",
      },
      grade_year: {
        type: "integer",
        description:
          "Série mínima (1-12) em que um aluno já teria base pra resolver — não precisa ser a mesma do conceito.",
      },
      difficulty: { type: "number", description: "0 (fácil) a 1 (difícil)." },
      confidence: {
        type: "number",
        description: "0 a 1, confiança na classificação.",
      },
      notes: {
        type: "string",
        description:
          "Qualquer problema na extração que a revisão humana precise saber. Vazio se nada.",
      },
    },
    required: [
      "stem_text",
      "alternatives",
      "needs_image",
      "concept_id",
      "grade_year",
      "difficulty",
      "confidence",
      "notes",
    ],
  },
};

function buildSystemPrompt(concepts: Concept[]): string {
  const list = concepts
    .map((c) => `${c.id} | ${c.code} | ${c.name}`)
    .join("\n");
  return `Você limpa e classifica questões de Matemática do ENEM extraídas de PDF.

CONCEITOS DISPONÍVEIS (id | código | nome):
${list}

Regras:
- stem_text e alternatives: reescreva em prosa limpa, preservando TODO o conteúdo e número original. Nunca invente dado novo, nunca resolva a questão.
- Letras duplicadas tipo "A A 1." no texto bruto são artefato de extração (negrito sobreposto) — a alternativa real é "1.".
- Se o enunciado depende de uma figura/gráfico/tabela que o texto não consegue reconstruir (ex.: "observe o gráfico abaixo" sem o gráfico), marque needs_image true e ainda assim preencha stem_text com o que houver de texto.
- concept_id: só da lista. Se a questão exigir mais de um conceito, escolha o mais específico/avançado. Se nada da lista encaixar de verdade, use null.
- Chame a tool tag_question exatamente uma vez.`;
}

async function tagOne(
  concepts: Concept[],
  q: ExtractedQuestion
): Promise<TaggedQuestion> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: buildSystemPrompt(concepts),
    messages: [
      {
        role: "user",
        content: `QUESTÃO ${q.item_number} (ENEM ${q.year}), texto bruto extraído do PDF:\n\n${q.raw_text}`,
      },
    ],
    tools: [tagTool],
    tool_choice: { type: "tool", name: "tag_question" },
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(
      `item ${q.item_number}: modelo não chamou a tool (${response.stop_reason})`
    );
  }
  const out = toolUse.input as Record<string, unknown>;

  const validIds = new Set(concepts.map((c) => c.id));
  const conceptId =
    typeof out.concept_id === "string" && validIds.has(out.concept_id)
      ? out.concept_id
      : null;

  return {
    ...q,
    stem_text: String(out.stem_text ?? ""),
    alternatives: out.alternatives as Record<string, string>,
    needs_image: Boolean(out.needs_image),
    concept_id: conceptId,
    concept_code: conceptId
      ? concepts.find((c) => c.id === conceptId)!.code
      : null,
    grade_year: typeof out.grade_year === "number" ? out.grade_year : null,
    difficulty: Math.min(Math.max(Number(out.difficulty ?? 0.5), 0), 1),
    tagger_confidence: Math.min(Math.max(Number(out.confidence ?? 0.5), 0), 1),
    tagger_notes: String(out.notes ?? ""),
  };
}

async function main() {
  const year = Number(process.argv[2]);
  if (!year) throw new Error("Uso: tag-enem.ts <ano>");

  const dir = rawDirFor(year);
  const extracted: ExtractedQuestion[] = JSON.parse(
    readFileSync(join(dir, "extracted.json"), "utf8")
  );
  const math = extracted.filter((q) => q.area === "matematica");
  console.log(`${math.length} questões de matemática pra etiquetar...`);

  const { data: concepts, error } = await admin
    .from("concepts")
    .select("id, code, name, grade_year")
    .eq("subject", "math");
  if (error || !concepts)
    throw error ?? new Error("sem conceitos de math no banco");

  const tagged: TaggedQuestion[] = [];
  for (const q of math) {
    try {
      const t = await tagOne(concepts as Concept[], q);
      tagged.push(t);
      console.log(
        `  item ${q.item_number}: ${t.concept_code ?? "(sem conceito)"} ` +
          `conf=${t.tagger_confidence.toFixed(2)}${t.needs_image ? " [precisa imagem]" : ""}`
      );
    } catch (e) {
      console.error(
        `  item ${q.item_number}: FALHOU — ${(e as Error).message}`
      );
    }
  }

  const outPath = join(dir, "tagged-matematica.json");
  writeFileSync(outPath, JSON.stringify(tagged, null, 2));
  console.log(`\n${tagged.length}/${math.length} etiquetadas -> ${outPath}`);
  console.log(
    `Próximo passo: npx tsx scripts/questions/review-enem.ts ${year}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
