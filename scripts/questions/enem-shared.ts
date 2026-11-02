import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

/**
 * Padrão de arquivo confirmado em download.inep.gov.br (ver docs/HANDOFF.md):
 *   Prova:    {ano}_PV_impresso_D{dia}_CD{caderno}.pdf
 *   Gabarito: {ano}_GB_impresso_D{dia}_CD{caderno}.pdf
 * Cada cor de caderno é a mesma prova embaralhada (anti-cola) — um caderno
 * por dia já cobre as 90 questões daquele dia. Usamos Azul (CD1) no 1º dia e
 * Amarelo (CD5) no 2º, que são os cadernos "Aplicação Regular" padrão.
 */
export interface EnemDay {
  day: 1 | 2;
  caderno: number;
  /** Faixa de item_number (numeração corre 1–180 pelo exame todo). */
  areas: {
    area: "linguagens" | "humanas" | "natureza" | "matematica";
    from: number;
    to: number;
  }[];
}

export const ENEM_DAYS: EnemDay[] = [
  {
    day: 1,
    caderno: 1,
    areas: [
      { area: "linguagens", from: 1, to: 45 },
      { area: "humanas", from: 46, to: 90 },
    ],
  },
  {
    day: 2,
    caderno: 5,
    areas: [
      { area: "natureza", from: 91, to: 135 },
      { area: "matematica", from: 136, to: 180 },
    ],
  },
];

export function areaForItem(itemNumber: number): string {
  for (const d of ENEM_DAYS) {
    for (const a of d.areas) {
      if (itemNumber >= a.from && itemNumber <= a.to) return a.area;
    }
  }
  throw new Error(`item_number ${itemNumber} fora de qualquer faixa conhecida`);
}

const here = dirname(fileURLToPath(import.meta.url));
export const ENEM_RAW_DIR = join(here, "..", "data", "enem-raw");

export function rawDirFor(year: number): string {
  const dir = join(ENEM_RAW_DIR, String(year));
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function provaUrl(year: number, day: EnemDay): string {
  return `https://download.inep.gov.br/enem/provas_e_gabaritos/${year}_PV_impresso_D${day.day}_CD${day.caderno}.pdf`;
}

export function gabaritoUrl(year: number, day: EnemDay): string {
  return `https://download.inep.gov.br/enem/provas_e_gabaritos/${year}_GB_impresso_D${day.day}_CD${day.caderno}.pdf`;
}

export interface ExtractedQuestion {
  year: number;
  item_number: number;
  area: string;
  /** Texto bruto na ordem de leitura (coluna esquerda, depois direita, por página). Pode vir com ruído de fórmula/figura — revisão humana corrige. */
  raw_text: string;
  correct_letter: "A" | "B" | "C" | "D" | "E";
  /** Página do PDF de prova onde a questão começa (1-indexed) — referência pra revisão manual. */
  page: number;
}
