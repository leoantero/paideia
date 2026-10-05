import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { admin } from "./lib/admin";

/**
 * Seed do currículo: conceitos, arestas de pré-requisito e cards de revisão.
 * Ver docs/LEARNING_GRAPH.md. Idempotente: rodar duas vezes não duplica.
 *
 * Cada matéria é um arquivo em scripts/data/. Os cards podem vir inline no
 * conceito (`cards`) ou, para matemática — cujo arquivo é grande e veio antes
 * da tabela concept_cards existir —, do mapa em cards-math-ef8.json.
 *
 * Valida que o grafo de pré-requisitos é um DAG ANTES de inserir — um ciclo
 * trava a recursão de concept_prerequisite_closure() e o CHECK da migration
 * só barra auto-referência.
 */

interface RawCard {
  front: string;
  back: string;
}
interface RawConcept {
  code: string;
  name: string;
  grade_year: number;
  difficulty: number;
  description: string;
  prerequisites: { code: string; strength: number }[];
  cards?: RawCard[];
}
interface RawData {
  curriculum: { code: string; label: string };
  subject: string;
  grade_band: string;
  concepts: RawConcept[];
}

const here = dirname(fileURLToPath(import.meta.url));
const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(join(here, "data", name), "utf8")) as T;

const SUBJECT_FILES = [
  "math-ef8.json",
  "portugues-ef8.json",
  "fisica-ef8.json",
  "historia-ef8.json",
  "biologia-ef8.json",
  "quimica-ef8.json",
];

/** Cards de matemática, mantidos fora do arquivo de conceitos. */
const EXTRA_CARDS = readJson<Record<string, RawCard[] | string>>(
  "cards-math-ef8.json"
);

/** Ciclo em pré-requisitos trava a recursão do fecho transitivo — barra antes de inserir. */
function assertDag(concepts: RawConcept[], subject: string) {
  const codes = new Set(concepts.map((c) => c.code));
  const adj = new Map<string, string[]>();
  for (const c of concepts) {
    for (const p of c.prerequisites) {
      if (!codes.has(p.code)) {
        throw new Error(
          `[${subject}] Pré-requisito ${p.code} de ${c.code} não existe na lista.`
        );
      }
    }
    adj.set(
      c.code,
      c.prerequisites.map((p) => p.code)
    );
  }

  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>([...codes].map((c) => [c, WHITE]));
  const stack: string[] = [];

  function visit(node: string) {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of adj.get(node) ?? []) {
      if (color.get(next) === GRAY) {
        throw new Error(
          `[${subject}] Ciclo em pré-requisitos: ${[...stack, next].join(" -> ")}`
        );
      }
      if (color.get(next) === WHITE) visit(next);
    }
    stack.pop();
    color.set(node, BLACK);
  }

  for (const c of codes) if (color.get(c) === WHITE) visit(c);
}

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
  data: RawData,
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

async function seedSubject(
  file: string
): Promise<{ concepts: number; edges: number; cards: number }> {
  const data = readJson<RawData>(file);
  assertDag(data.concepts, data.subject);

  const { data: cv, error: cvErr } = await admin
    .from("curriculum_versions")
    .upsert(
      {
        code: data.curriculum.code,
        label: data.curriculum.label,
        is_active: true,
      },
      { onConflict: "code" }
    )
    .select("id")
    .single();
  if (cvErr || !cv)
    throw cvErr ?? new Error("upsert curriculum_versions falhou");

  const { data: inserted, error: cErr } = await admin
    .from("concepts")
    .upsert(
      data.concepts.map((c) => ({
        curriculum_version_id: cv.id,
        code: c.code,
        name: c.name,
        subject: data.subject,
        grade_band: data.grade_band,
        grade_year: c.grade_year,
        description: c.description,
        intrinsic_difficulty: c.difficulty,
      })),
      { onConflict: "curriculum_version_id,code" }
    )
    .select("id, code");
  if (cErr || !inserted)
    throw cErr ?? new Error(`upsert concepts falhou (${data.subject})`);

  const idByCode = new Map(inserted.map((r) => [r.code, r.id]));

  const prereqRows = data.concepts.flatMap((c) =>
    c.prerequisites.map((p) => ({
      concept_id: idByCode.get(c.code)!,
      prerequisite_id: idByCode.get(p.code)!,
      strength: p.strength,
    }))
  );
  if (prereqRows.length > 0) {
    const { error: pErr } = await admin
      .from("concept_prerequisites")
      .upsert(prereqRows, { onConflict: "concept_id,prerequisite_id" });
    if (pErr) throw pErr;
  }

  // cards: inline no conceito, ou do mapa extra (matemática)
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
  const cardRows = await upsertConceptDeck(data, flashcards);

  console.log(
    `  ${data.subject.padEnd(10)} ${String(inserted.length).padStart(2)} conceitos · ` +
      `${String(prereqRows.length).padStart(2)} arestas · ${String(cardRows.length).padStart(2)} cards`
  );
  return {
    concepts: inserted.length,
    edges: prereqRows.length,
    cards: cardRows.length,
  };
}

async function main() {
  let concepts = 0,
    edges = 0,
    cards = 0;
  for (const file of SUBJECT_FILES) {
    const r = await seedSubject(file);
    concepts += r.concepts;
    edges += r.edges;
    cards += r.cards;
  }
  console.log(
    `\nTotal: ${concepts} conceitos, ${edges} arestas, ${cards} cards.`
  );

  // Sanity: o fecho de "função afim" tem que alcançar "operações com frações".
  // É a consulta que sustenta o diagnóstico causal do produto — se ela quebrar,
  // o Conselheiro e o heatmap perdem o poder de explicar a raiz da dificuldade.
  const { data: fun } = await admin
    .from("concepts")
    .select("id")
    .eq("code", "EF08MA-FUNAF")
    .single();
  const { data: frac } = await admin
    .from("concepts")
    .select("id")
    .eq("code", "EF07MA-FRACOP")
    .single();
  const { data: closure, error: clErr } = await admin.rpc(
    "concept_prerequisite_closure",
    {
      p_concept_id: fun!.id,
    }
  );
  if (clErr) throw clErr;
  const reached = (
    closure as { prerequisite_id: string; depth: number }[]
  ).find((r) => r.prerequisite_id === frac!.id);
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
