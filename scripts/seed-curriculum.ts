import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { admin } from "./lib/admin";

/**
 * Seed do currículo — recorte deliberadamente pequeno (matemática, 8º ano).
 * Ver docs/LEARNING_GRAPH.md. Idempotente: rodar duas vezes não duplica.
 *
 * Valida que o grafo de pré-requisitos é um DAG ANTES de inserir — um ciclo
 * trava a recursão de concept_prerequisite_closure() e o CHECK da migration
 * só barra auto-referência.
 */

interface RawConcept {
  code: string;
  name: string;
  grade_year: number;
  difficulty: number;
  description: string;
  prerequisites: { code: string; strength: number }[];
}
interface RawData {
  curriculum: { code: string; label: string };
  subject: string;
  grade_band: string;
  concepts: RawConcept[];
}

const here = dirname(fileURLToPath(import.meta.url));
const data: RawData = JSON.parse(
  readFileSync(join(here, "data", "math-ef8.json"), "utf8")
);

function assertDag(concepts: RawConcept[]) {
  const codes = new Set(concepts.map((c) => c.code));
  const adj = new Map<string, string[]>();
  for (const c of concepts) {
    for (const p of c.prerequisites) {
      if (!codes.has(p.code)) {
        throw new Error(`Pré-requisito ${p.code} de ${c.code} não existe na lista.`);
      }
    }
    // aresta: concept -> prerequisite (queremos detectar ciclo nessa direção)
    adj.set(c.code, c.prerequisites.map((p) => p.code));
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>([...codes].map((c) => [c, WHITE]));
  const stack: string[] = [];

  function visit(node: string) {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of adj.get(node) ?? []) {
      if (color.get(next) === GRAY) {
        throw new Error(`Ciclo em pré-requisitos: ${[...stack, next].join(" -> ")}`);
      }
      if (color.get(next) === WHITE) visit(next);
    }
    stack.pop();
    color.set(node, BLACK);
  }

  for (const c of codes) if (color.get(c) === WHITE) visit(c);
}

async function main() {
  assertDag(data.concepts);
  console.log(`DAG ok — ${data.concepts.length} conceitos.`);

  // 1. curriculum version
  const { data: cv, error: cvErr } = await admin
    .from("curriculum_versions")
    .upsert(
      { code: data.curriculum.code, label: data.curriculum.label, is_active: true },
      { onConflict: "code" }
    )
    .select("id")
    .single();
  if (cvErr || !cv) throw cvErr ?? new Error("upsert curriculum_versions falhou");

  // 2. concepts
  const rows = data.concepts.map((c) => ({
    curriculum_version_id: cv.id,
    code: c.code,
    name: c.name,
    subject: data.subject,
    grade_band: data.grade_band,
    grade_year: c.grade_year,
    description: c.description,
    intrinsic_difficulty: c.difficulty,
  }));
  const { data: inserted, error: cErr } = await admin
    .from("concepts")
    .upsert(rows, { onConflict: "curriculum_version_id,code" })
    .select("id, code");
  if (cErr || !inserted) throw cErr ?? new Error("upsert concepts falhou");

  const idByCode = new Map(inserted.map((r) => [r.code, r.id]));

  // 3. prerequisites
  const prereqRows = data.concepts.flatMap((c) =>
    c.prerequisites.map((p) => ({
      concept_id: idByCode.get(c.code)!,
      prerequisite_id: idByCode.get(p.code)!,
      strength: p.strength,
    }))
  );
  const { error: pErr } = await admin
    .from("concept_prerequisites")
    .upsert(prereqRows, { onConflict: "concept_id,prerequisite_id" });
  if (pErr) throw pErr;

  console.log(`Inseridos: ${inserted.length} conceitos, ${prereqRows.length} arestas.`);

  // 4. sanity: o fecho de "função afim" tem que alcançar "operações com frações"
  const funaf = idByCode.get("EF08MA-FUNAF")!;
  const fracop = idByCode.get("EF07MA-FRACOP")!;
  const { data: closure, error: clErr } = await admin.rpc(
    "concept_prerequisite_closure",
    { p_concept_id: funaf }
  );
  if (clErr) throw clErr;
  const reached = (closure as { prerequisite_id: string; depth: number }[]).find(
    (r) => r.prerequisite_id === fracop
  );
  if (!reached || reached.depth < 2) {
    throw new Error(
      "Sanity falhou: função afim não alcança operações com frações em depth >= 2."
    );
  }
  console.log(
    `Sanity ok — função afim -> operações com frações em depth ${reached.depth}.`
  );
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
