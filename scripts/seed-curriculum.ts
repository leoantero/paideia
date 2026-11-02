import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { admin } from "./lib/admin";
import {
  loadBnccReference,
  loadCurriculumFiles,
  validateBnccCoverage,
  validateGraph,
  type CurriculumFile,
} from "./lib/curriculum";

/**
 * Seed do currículo: conceitos, arestas de pré-requisito e cards de revisão.
 * Ver docs/LEARNING_GRAPH.md. Idempotente: rodar duas vezes não duplica.
 *
 * Cada arquivo em scripts/data/ é uma matéria em um segmento. Pré-requisitos
 * cruzam arquivos (o EM depende do 6º ano), então os conceitos de todos os
 * arquivos entram primeiro e as arestas só depois, com o mapa global de ids.
 * Os cards podem vir inline no conceito (`cards`) ou, para matemática, do mapa
 * em cards-math-ef8.json.
 *
 * O grafo é validado ANTES de inserir (DAG, arestas resolvidas, cobertura
 * BNCC) — é o mesmo validador do `npm test`, só que aqui ele barra o seed.
 */

interface RawCard {
  front: string;
  back: string;
}

const here = dirname(fileURLToPath(import.meta.url));

/** Cards de matemática, mantidos fora do arquivo de conceitos. */
const EXTRA_CARDS = JSON.parse(
  readFileSync(join(here, "data", "cards-math-ef8.json"), "utf8")
) as Record<string, RawCard[] | string>;

const SUBJECT_LABELS: Record<string, string> = {
  math: "Matemática",
  language: "Português",
  physics: "Física",
  history: "História",
  biology: "Biologia",
  chemistry: "Química",
};

/**
 * Os cards de conceito viram flashcards (autoavaliados) num baralho por
 * matéria e segmento — mesmo formato em que 0021 migrou os antigos
 * concept_cards. Um card já existente mantém id e posição (o estado SM-2 dos
 * alunos está preso ao id); card novo entra no fim do baralho.
 */
async function upsertConceptDeck(
  data: CurriculumFile,
  flashcards: { concept_id: string; front: string; back: string }[]
): Promise<unknown[]> {
  if (flashcards.length === 0) return [];

  const deckId = `conceitos-${data.subject}-${data.grade_band}`;
  const { error: deckErr } = await admin.from("decks").upsert({
    id: deckId,
    title: `Conceitos de ${SUBJECT_LABELS[data.subject] ?? data.subject}`,
    subject: data.subject,
    grade_level: data.grade_band,
    description: "Um card por ideia-chave dos conceitos do currículo.",
    review_status: "approved",
  });
  if (deckErr) throw deckErr;

  const { data: existing, error: exErr } = await admin
    .from("cards")
    .select("id, concept_id, prompt, position")
    .eq("deck_id", deckId);
  if (exErr) throw exErr;

  const key = (conceptId: string, prompt: string) => `${conceptId}|${prompt}`;
  const byKey = new Map(
    (existing ?? []).map((c) => [key(c.concept_id, c.prompt), c])
  );
  let nextPosition = Math.max(0, ...(existing ?? []).map((c) => c.position));

  const rows = flashcards.map((f) => {
    const hit = byKey.get(key(f.concept_id, f.front));
    return {
      id: hit?.id ?? randomUUID(),
      deck_id: deckId,
      concept_id: f.concept_id,
      position: hit?.position ?? ++nextPosition,
      kind: "flashcard",
      prompt: f.front,
      answer: f.back,
    };
  });

  const { error: cardErr } = await admin.from("cards").upsert(rows);
  if (cardErr) throw cardErr;
  return rows;
}

async function upsertCurriculumVersion(
  code: string,
  label: string
): Promise<string> {
  const { data: cv, error } = await admin
    .from("curriculum_versions")
    .upsert({ code, label, is_active: true }, { onConflict: "code" })
    .select("id")
    .single();
  if (error || !cv)
    throw error ?? new Error("upsert curriculum_versions falhou");
  return cv.id;
}

/** Insere os conceitos de um arquivo e devolve code -> id. */
async function seedConcepts(
  data: CurriculumFile,
  versionId: string
): Promise<Map<string, string>> {
  const { data: inserted, error } = await admin
    .from("concepts")
    .upsert(
      data.concepts.map((c) => ({
        curriculum_version_id: versionId,
        code: c.code,
        name: c.name,
        subject: data.subject,
        grade_band: data.grade_band,
        grade_year: c.grade_year,
        description: c.description,
        intrinsic_difficulty: c.difficulty,
        bncc_codes: c.bncc,
      })),
      { onConflict: "curriculum_version_id,code" }
    )
    .select("id, code");
  if (error || !inserted)
    throw error ?? new Error(`upsert concepts falhou (${data.file})`);
  return new Map(inserted.map((r) => [r.code, r.id]));
}

async function seedCards(
  data: CurriculumFile,
  idByCode: Map<string, string>
): Promise<number> {
  const flashcards = [...data.concepts]
    .sort((a, b) => a.code.localeCompare(b.code))
    .flatMap((c) => {
      const extra = EXTRA_CARDS[c.code];
      const cards = c.cards ?? (Array.isArray(extra) ? extra : []);
      return cards.map((card) => ({
        concept_id: idByCode.get(c.code)!,
        front: card.front,
        back: card.back,
      }));
    });
  return (await upsertConceptDeck(data, flashcards)).length;
}

async function main() {
  const files = loadCurriculumFiles();
  const problems = [
    ...validateGraph(files),
    ...validateBnccCoverage(files, "math", loadBnccReference("matematica"), {
      ef: [5, 6, 7, 8, 9],
      em: true,
    }),
  ];
  if (problems.length > 0) {
    throw new Error(
      `Grafo inválido, nada foi inserido:\n  ${problems.join("\n  ")}`
    );
  }

  // 1. conceitos de todos os arquivos, para ter o mapa global de ids
  const versionIds = new Map<string, string>();
  const idByCode = new Map<string, string>();
  const perFile: Array<{ data: CurriculumFile; ids: Map<string, string> }> = [];
  for (const data of files) {
    let versionId = versionIds.get(data.curriculum.code);
    if (!versionId) {
      versionId = await upsertCurriculumVersion(
        data.curriculum.code,
        data.curriculum.label
      );
      versionIds.set(data.curriculum.code, versionId);
    }
    const ids = await seedConcepts(data, versionId);
    for (const [code, id] of ids) idByCode.set(code, id);
    perFile.push({ data, ids });
  }

  // 2. arestas, que podem cruzar arquivos
  const prereqRows = files.flatMap((f) =>
    f.concepts.flatMap((c) =>
      c.prerequisites.map((p) => ({
        concept_id: idByCode.get(c.code)!,
        prerequisite_id: idByCode.get(p.code)!,
        strength: p.strength,
      }))
    )
  );
  if (prereqRows.length > 0) {
    const { error } = await admin
      .from("concept_prerequisites")
      .upsert(prereqRows, { onConflict: "concept_id,prerequisite_id" });
    if (error) throw error;
  }

  // 3. cards
  let cards = 0;
  for (const { data, ids } of perFile) {
    const n = await seedCards(data, ids);
    cards += n;
    const edges = data.concepts.reduce((s, c) => s + c.prerequisites.length, 0);
    console.log(
      `  ${data.file.padEnd(20)} ${String(data.concepts.length).padStart(3)} conceitos · ` +
        `${String(edges).padStart(3)} arestas · ${String(n).padStart(2)} cards`
    );
  }
  console.log(
    `\nTotal: ${idByCode.size} conceitos, ${prereqRows.length} arestas, ${cards} cards.`
  );

  // Sanity: o fecho de "função afim" tem que alcançar "operações com frações".
  // É a consulta que sustenta o diagnóstico causal do produto — se ela quebrar,
  // o Conselheiro e o heatmap perdem o poder de explicar a raiz da dificuldade.
  const { data: closure, error: clErr } = await admin.rpc(
    "concept_prerequisite_closure",
    { p_concept_id: idByCode.get("EF08MA-FUNAF")! }
  );
  if (clErr) throw clErr;
  const reached = (
    closure as { prerequisite_id: string; depth: number }[]
  ).find((r) => r.prerequisite_id === idByCode.get("EF07MA-FRACOP"));
  if (!reached || reached.depth < 2) {
    throw new Error(
      "Sanity falhou: função afim não alcança operações com frações em depth >= 2."
    );
  }
  console.log(
    `Sanity ok — função afim -> operações com frações em depth ${reached.depth}.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
