// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  loadBnccReference,
  loadCurriculumFiles,
  validateBnccCoverage,
  validateGraph,
} from "@/scripts/lib/curriculum";

/**
 * O grafo de conceitos é o que ancora toda evidência do learning graph
 * (docs/LEARNING_GRAPH.md). Um erro aqui — ciclo, aresta pendurada, código
 * BNCC inventado — não quebra em teste de UI; quebra o diagnóstico causal do
 * Conselheiro e do heatmap, em silêncio. Por isso o grafo inteiro é validado
 * no `npm test`, antes de qualquer seed.
 */
describe("scripts/data — grafo de conceitos", () => {
  const files = loadCurriculumFiles();

  it("carrega todos os arquivos de conceitos", () => {
    const names = files.map((f) => f.file);
    expect(names).toEqual(
      expect.arrayContaining(["math-ef1.json", "math-ef2.json", "math-em.json"])
    );
  });

  it("é um DAG com códigos únicos, arestas resolvidas e séries coerentes", () => {
    expect(validateGraph(files)).toEqual([]);
  });

  it("matemática cobre toda habilidade da BNCC do 5º ano ao EM, e só cita códigos oficiais", () => {
    const reference = loadBnccReference("matematica");
    expect(reference.length).toBeGreaterThan(180);
    const problems = validateBnccCoverage(files, "math", reference, {
      ef: [5, 6, 7, 8, 9],
      em: true,
    });
    expect(problems).toEqual([]);
  });

  it("mantém os códigos que o histórico, os baralhos e os seeds já apontam", () => {
    const codes = new Set(files.flatMap((f) => f.concepts.map((c) => c.code)));
    for (const code of [
      "EF06MA-FRAC",
      "EF07MA-FRACOP",
      "EF07MA-INT",
      "EF07MA-PROP",
      "EF06MA-PORC",
      "EF08MA01",
      "EF08MA-POT",
      "EF08MA05",
      "EF07MA-CART",
      "EF08MA06",
      "EF08MA08",
      "EF08MA-SEQ",
      "EF08MA-FUNAF",
      "EF08MA14",
      "EF08MA-POL",
      "EF08MA18",
      "EF08MA17",
      "EF08MA-AREA",
      "EF08MA-VOL",
      "EF08MA-PMC",
      "EF08MA22",
      "EF08MA25",
      "EF08MA23",
      "EF08MA27",
      "EF07MA-DEC",
      "EF08MA-INEQ",
      "EF08MA04",
      // renomeados em 0027_concept_bncc_codes.sql
      "EF07MA-EQ1",
      "EF07MA-PARAL",
      "EF09MA-PORCSUC",
      "EF09MA-PN",
      "EF09MA-FAT",
      "EF06MA-ANG",
    ]) {
      expect(codes.has(code), code).toBe(true);
    }
  });

  it("função afim alcança operações com frações em pelo menos dois passos", () => {
    // É a consulta que sustenta o diagnóstico causal: "travou em função afim,
    // mas a raiz é fração". Se este caminho sumir, o produto perde a frase.
    const byCode = new Map(
      files.flatMap((f) => f.concepts.map((c) => [c.code, c] as const))
    );
    const depth = new Map<string, number>();
    const queue: Array<[string, number]> = [["EF08MA-FUNAF", 0]];
    while (queue.length) {
      const [code, d] = queue.shift()!;
      for (const p of byCode.get(code)!.prerequisites) {
        if (!depth.has(p.code)) {
          depth.set(p.code, d + 1);
          queue.push([p.code, d + 1]);
        }
      }
    }
    expect(depth.get("EF07MA-FRACOP")).toBeGreaterThanOrEqual(2);
    expect(depth.get("EF05MA-FRAC")).toBeDefined();
  });
});
