import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

/**
 * Carrega e valida o grafo de conceitos de scripts/data/*.json. Puro (sem
 * banco) para que a validação rode no `npm test` e não no meio do seed.
 *
 * Um arquivo = uma matéria em um segmento (grade_band). Pré-requisitos podem
 * cruzar arquivos (função afim do EM depende de fração do 6º ano), então a
 * validação é global: códigos únicos no conjunto, toda aresta resolve, e o
 * grafo inteiro é um DAG — um ciclo trava a recursão de
 * concept_prerequisite_closure() e o CHECK da migration só barra
 * auto-referência.
 *
 * `bncc` ancora o conceito nas habilidades oficiais. Para Matemática a
 * referência é bncc-matematica.json e a checagem é nos dois sentidos: nenhum
 * código inventado, nenhuma habilidade esquecida (validateBnccCoverage).
 */

const BAND_YEARS: Record<string, [number, number]> = {
  elementary_1: [1, 5],
  elementary_2: [6, 9],
  high_school: [10, 12],
};

const cardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});

const conceptSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Z0-9-]+$/, "código em maiúsculas, dígitos e hífen"),
  name: z.string().min(1),
  grade_year: z.number().int().min(1).max(12),
  difficulty: z.number().min(0).max(1),
  description: z.string().min(1),
  bncc: z
    .array(z.string().regex(/^(EF\d{2}[A-Z]{2}\d{2}|EM13[A-Z]{3}\d{3})$/))
    .default([]),
  prerequisites: z.array(
    z.object({ code: z.string().min(1), strength: z.number().min(0).max(1) })
  ),
  cards: z.array(cardSchema).optional(),
});

const fileSchema = z.object({
  _comment: z.string().optional(),
  curriculum: z.object({ code: z.string().min(1), label: z.string().min(1) }),
  subject: z.string().min(1),
  grade_band: z.enum(["elementary_1", "elementary_2", "high_school"]),
  concepts: z.array(conceptSchema).min(1),
});

export type RawConcept = z.infer<typeof conceptSchema>;
export type CurriculumFile = z.infer<typeof fileSchema> & { file: string };

const bnccRefSchema = z.object({
  habilidades: z.array(
    z.object({
      codigo: z.string(),
      etapa: z.enum(["EF", "EM"]),
      anos: z.array(z.number().int()).optional(),
      texto: z.string(),
    })
  ),
});
export type BnccHabilidade = z.infer<
  typeof bnccRefSchema
>["habilidades"][number];

export const DATA_DIR = path.join(__dirname, "..", "data");

/** Arquivos de conceitos: todo .json de scripts/data/ que tenha `concepts`. */
export function loadCurriculumFiles(dir = DATA_DIR): CurriculumFile[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((f) => {
      const raw = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
      if (!raw || typeof raw !== "object" || !("concepts" in raw)) return [];
      const parsed = fileSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          `[${f}] ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
        );
      }
      return [{ ...parsed.data, file: f }];
    });
}

/** Referência oficial de uma área: scripts/data/bncc-<area>.json. */
export function loadBnccReference(
  area: string,
  dir = DATA_DIR
): BnccHabilidade[] {
  const raw = JSON.parse(
    readFileSync(path.join(dir, `bncc-${area}.json`), "utf8")
  );
  return bnccRefSchema.parse(raw).habilidades;
}

/** Ano de uma habilidade do EF pelo código (EF07MA23 -> 7). Códigos de dois anos (EF67LP08) devolvem null. */
export function bnccYear(code: string): number | null {
  const m = /^EF(\d)(\d)[A-Z]{2}\d{2}$/.exec(code);
  if (!m) return null;
  return m[1] === "0" ? Number(m[2]) : null;
}

/**
 * Regras estruturais do grafo. Devolve a lista de problemas; vazia = ok.
 * Lança nada, para o teste conseguir mostrar todos de uma vez.
 */
export function validateGraph(files: CurriculumFile[]): string[] {
  const problems: string[] = [];
  const all = files.flatMap((f) =>
    f.concepts.map((c) => ({
      ...c,
      file: f.file,
      band: f.grade_band,
      subject: f.subject,
    }))
  );
  const byCode = new Map<string, (typeof all)[number]>();

  for (const c of all) {
    if (byCode.has(c.code))
      problems.push(
        `[${c.file}] código duplicado: ${c.code} (também em ${byCode.get(c.code)!.file})`
      );
    byCode.set(c.code, c);

    const [lo, hi] = BAND_YEARS[c.band];
    if (c.grade_year < lo || c.grade_year > hi) {
      problems.push(
        `[${c.file}] ${c.code}: grade_year ${c.grade_year} fora de ${c.band} (${lo}–${hi})`
      );
    }
    for (const b of c.bncc) {
      const y = bnccYear(b);
      if (y !== null && y !== c.grade_year) {
        problems.push(
          `[${c.file}] ${c.code}: habilidade ${b} é do ${y}º ano, conceito está no ${c.grade_year}º`
        );
      }
      if (b.startsWith("EM13") && c.band !== "high_school") {
        problems.push(
          `[${c.file}] ${c.code}: habilidade de EM (${b}) em conceito de ${c.band}`
        );
      }
    }
    const seen = new Set<string>();
    for (const p of c.prerequisites) {
      if (seen.has(p.code))
        problems.push(
          `[${c.file}] ${c.code}: pré-requisito repetido ${p.code}`
        );
      seen.add(p.code);
      if (p.code === c.code)
        problems.push(`[${c.file}] ${c.code}: pré-requisito de si mesmo`);
    }
  }

  for (const c of all) {
    for (const p of c.prerequisites) {
      const target = byCode.get(p.code);
      if (!target) {
        problems.push(
          `[${c.file}] ${c.code}: pré-requisito ${p.code} não existe`
        );
        continue;
      }
      if (target.grade_year > c.grade_year) {
        problems.push(
          `[${c.file}] ${c.code} (${c.grade_year}º) depende de ${p.code}, que é do ${target.grade_year}º — pré-requisito não pode vir depois`
        );
      }
    }
  }

  problems.push(
    ...findCycles(all.map((c) => [c.code, c.prerequisites.map((p) => p.code)]))
  );
  return problems;
}

/** DFS com três cores; devolve uma mensagem por ciclo encontrado. */
function findCycles(adjacency: Array<[string, string[]]>): string[] {
  const adj = new Map(adjacency);
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>([...adj.keys()].map((c) => [c, WHITE]));
  const stack: string[] = [];
  const cycles: string[] = [];

  function visit(node: string) {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of adj.get(node) ?? []) {
      if (!color.has(next)) continue; // aresta pendurada já foi reportada
      if (color.get(next) === GRAY)
        cycles.push(
          `ciclo em pré-requisitos: ${[...stack, next].join(" -> ")}`
        );
      else if (color.get(next) === WHITE) visit(next);
    }
    stack.pop();
    color.set(node, BLACK);
  }

  for (const c of adj.keys()) if (color.get(c) === WHITE) visit(c);
  return cycles;
}

/**
 * Cobertura contra a referência oficial de uma matéria: toda habilidade da
 * referência aparece em algum conceito, e nenhum conceito cita código que não
 * está lá. `years` limita a referência (o grafo começa no 5º ano).
 */
export function validateBnccCoverage(
  files: CurriculumFile[],
  subject: string,
  reference: BnccHabilidade[],
  years: { ef: number[]; em: boolean }
): string[] {
  const problems: string[] = [];
  const concepts = files
    .filter((f) => f.subject === subject)
    .flatMap((f) => f.concepts);
  const cited = new Map<string, string[]>();
  for (const c of concepts)
    for (const b of c.bncc) cited.set(b, [...(cited.get(b) ?? []), c.code]);

  const expected = reference.filter((h) =>
    h.etapa === "EM"
      ? years.em
      : (h.anos ?? []).some((y) => years.ef.includes(y))
  );
  const known = new Set(reference.map((h) => h.codigo));

  for (const h of expected) {
    if (!cited.has(h.codigo))
      problems.push(
        `habilidade sem conceito: ${h.codigo} — ${h.texto.slice(0, 80)}…`
      );
  }
  for (const [code, owners] of cited) {
    if (!known.has(code))
      problems.push(
        `código BNCC inexistente: ${code} (em ${owners.join(", ")})`
      );
  }
  return problems;
}
