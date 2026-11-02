import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ENEM_DAYS, provaUrl, gabaritoUrl, rawDirFor } from "./enem-shared";

/**
 * Baixa prova + gabarito do ENEM direto do INEP (download.inep.gov.br),
 * cacheando em scripts/data/enem-raw/<ano>/. Idempotente: não baixa de novo
 * se o arquivo já existe.
 *
 * Uso: npx tsx scripts/questions/fetch-enem.ts 2023
 */
async function download(url: string, path: string) {
  if (existsSync(path)) {
    console.log(`  (cache) ${path}`);
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  console.log(`  baixado ${path} (${res.headers.get("content-length")} bytes)`);
}

async function main() {
  const year = Number(process.argv[2]);
  if (!year || year < 1998 || year > 2030) {
    throw new Error("Uso: fetch-enem.ts <ano>, ex.: fetch-enem.ts 2023");
  }

  const dir = rawDirFor(year);
  for (const day of ENEM_DAYS) {
    await download(provaUrl(year, day), join(dir, `prova-d${day.day}.pdf`));
    await download(
      gabaritoUrl(year, day),
      join(dir, `gabarito-d${day.day}.pdf`)
    );
  }
  console.log(`\nOK — ${year} em ${dir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
