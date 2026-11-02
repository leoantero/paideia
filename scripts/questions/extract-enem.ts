import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  ENEM_DAYS,
  areaForItem,
  rawDirFor,
  type ExtractedQuestion,
} from "./enem-shared";

/**
 * Extrai texto bruto por questão dos PDFs da prova e letra certa do gabarito.
 *
 * Layout confirmado por inspeção manual (ver docs/HANDOFF.md): cada página é
 * DUAS COLUNAS (esquerda x < meio da página, direita x >= meio); dentro de
 * cada coluna as linhas correm de cima pra baixo. O enunciado de cada questão
 * é delimitado por "QUESTÃO <n>".
 *
 * Isto é best-effort: fórmulas (frações, expoentes, raízes) viram texto
 * solto sem estrutura, porque o PDF não guarda a fração como texto linear —
 * só como glifos em posições (x,y) diferentes. A etapa de tagging (Claude) e
 * a revisão humana (review-enem.ts) existem exatamente para corrigir isso;
 * não tente reconstruir fórmulas aqui.
 */

interface TextItem {
  str: string;
  x: number;
  y: number;
}

async function pageLines(page: import("pdfjs-dist").PDFPageProxy): Promise<{
  left: string[];
  right: string[];
}> {
  const viewport = page.getViewport({ scale: 1 });
  const mid = viewport.width / 2;
  const content = await page.getTextContent();

  const items: TextItem[] = content.items
    .filter((i) => "str" in i && i.str.trim() !== "")
    .map((i) => {
      const item = i as { str: string; transform: number[] };
      return { str: item.str, x: item.transform[4], y: item.transform[5] };
    });

  const left = items.filter((i) => i.x < mid);
  const right = items.filter((i) => i.x >= mid);

  const toLines = (col: TextItem[]) => {
    const byY = new Map<number, TextItem[]>();
    for (const item of col) {
      const key = Math.round(item.y);
      const bucket = byY.get(key) ?? [];
      bucket.push(item);
      byY.set(key, bucket);
    }
    return [...byY.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, line]) =>
        line
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter(Boolean);
  };

  return { left: toLines(left), right: toLines(right) };
}

async function extractProvaText(
  path: string
): Promise<{ text: string; pageOfOffset: number[] }> {
  const data = new Uint8Array(readFileSync(path));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  let text = "";
  const pageOfOffset: number[] = []; // pageOfOffset[i] = página onde o caractere i cai (aprox., por linha)

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { left, right } = await pageLines(page);
    for (const line of [...left, ...right]) {
      pageOfOffset[text.length] = p;
      text += line + "\n";
    }
  }
  return { text, pageOfOffset };
}

function splitQuestions(
  text: string,
  pageOfOffset: number[],
  year: number
): Omit<ExtractedQuestion, "correct_letter">[] {
  const marker = /QUESTÃO\s+(\d{1,3})\b/g;
  const matches = [...text.matchAll(marker)];
  const out: Omit<ExtractedQuestion, "correct_letter">[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const itemNumber = Number(m[1]);
    const start = m.index! + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const raw = text.slice(start, end).trim();

    let page = 1;
    for (let off = m.index!; off >= 0; off--) {
      if (pageOfOffset[off]) {
        page = pageOfOffset[off];
        break;
      }
    }

    let area: string;
    try {
      area = areaForItem(itemNumber);
    } catch {
      continue; // número fora de faixa (índice de instrução, nota de rodapé etc.) — ignora
    }

    out.push({ year, item_number: itemNumber, area, raw_text: raw, page });
  }
  return out;
}

async function extractGabarito(
  path: string
): Promise<Map<number, "A" | "B" | "C" | "D" | "E">> {
  const data = new Uint8Array(readFileSync(path));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const { left, right } = await pageLines(page);

  const map = new Map<number, "A" | "B" | "C" | "D" | "E">();
  const lineRe = /^(\d{1,3})\s+([A-E])\s*$/;
  for (const line of [...left, ...right]) {
    const m = line.match(lineRe);
    if (m) map.set(Number(m[1]), m[2] as "A" | "B" | "C" | "D" | "E");
  }
  return map;
}

async function main() {
  const year = Number(process.argv[2]);
  if (!year) throw new Error("Uso: extract-enem.ts <ano>");

  const dir = rawDirFor(year);
  const all: ExtractedQuestion[] = [];

  for (const day of ENEM_DAYS) {
    const provaPath = join(dir, `prova-d${day.day}.pdf`);
    const gabaritoPath = join(dir, `gabarito-d${day.day}.pdf`);

    console.log(`Dia ${day.day}: extraindo texto da prova...`);
    const { text, pageOfOffset } = await extractProvaText(provaPath);
    const questions = splitQuestions(text, pageOfOffset, year);

    console.log(`Dia ${day.day}: extraindo gabarito...`);
    const answers = await extractGabarito(gabaritoPath);

    for (const q of questions) {
      const letter = answers.get(q.item_number);
      if (!letter) {
        console.warn(
          `  aviso: sem gabarito pra item ${q.item_number}, pulando`
        );
        continue;
      }
      all.push({ ...q, correct_letter: letter });
    }
    console.log(
      `  ${questions.length} questões encontradas, ${answers.size} gabaritos`
    );
  }

  const outPath = join(dir, "extracted.json");
  writeFileSync(outPath, JSON.stringify(all, null, 2));

  const byArea = new Map<string, number>();
  for (const q of all) byArea.set(q.area, (byArea.get(q.area) ?? 0) + 1);
  console.log(`\nTotal: ${all.length} questões -> ${outPath}`);
  for (const [area, n] of byArea) console.log(`  ${area.padEnd(12)} ${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
