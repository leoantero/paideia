import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { admin } from "../lib/admin";
import { rawDirFor } from "./enem-shared";

/**
 * CLI de revisão humana: passa pelas questões etiquetadas por tag-enem.ts
 * uma a uma, mostra a etiqueta da IA e o texto limpo, e deixa aprovar,
 * editar o texto/conceito, ou rejeitar. Só o que for aprovado aqui entra em
 * public_questions como 'approved' — o resto fica fora do banco.
 *
 * Questões com needs_image=true são puladas automaticamente nesta rodada
 * (v1 não extrai imagem do PDF — ver docs/HANDOFF.md).
 *
 * Uso: npx tsx scripts/questions/review-enem.ts <ano>
 */

interface TaggedQuestion {
  year: number;
  item_number: number;
  area: string;
  page: number;
  correct_letter: "A" | "B" | "C" | "D" | "E";
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

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function ask(prompt: string): Promise<string> {
  return (await rl.question(prompt)).trim();
}

function printQuestion(q: TaggedQuestion) {
  console.log(`\n${"─".repeat(72)}`);
  console.log(
    `ENEM ${q.year} — item ${q.item_number} (pág. ${q.page} do PDF da prova)`
  );
  console.log(
    `conceito: ${q.concept_code ?? "(nenhum)"} | série: ${q.grade_year ?? "?"} | ` +
      `dificuldade: ${q.difficulty.toFixed(2)} | confiança: ${q.tagger_confidence.toFixed(2)}`
  );
  if (q.tagger_notes) console.log(`nota da IA: ${q.tagger_notes}`);
  console.log(`\n${q.stem_text}\n`);
  for (const letter of ["A", "B", "C", "D", "E"] as const) {
    const mark = letter === q.correct_letter ? "*" : " ";
    console.log(`  ${mark} ${letter}) ${q.alternatives[letter]}`);
  }
}

async function main() {
  const year = Number(process.argv[2]);
  if (!year) throw new Error("Uso: review-enem.ts <ano>");

  const dir = rawDirFor(year);
  const tagged: TaggedQuestion[] = JSON.parse(
    readFileSync(join(dir, "tagged-matematica.json"), "utf8")
  );

  const { data: existingRows } = await admin
    .from("public_questions")
    .select("item_number")
    .eq("origin", "enem")
    .eq("exam_year", year);
  const already = new Set((existingRows ?? []).map((r) => r.item_number));

  let approved = 0;
  let rejected = 0;
  let skippedImage = 0;
  let skippedDone = 0;

  for (const q of tagged) {
    if (already.has(q.item_number)) {
      skippedDone++;
      continue;
    }
    if (q.needs_image) {
      skippedImage++;
      continue;
    }
    if (!q.concept_id) {
      console.log(
        `\nitem ${q.item_number}: sem conceito atribuído, pulando (edite o JSON manualmente se quiser revisar).`
      );
      continue;
    }

    printQuestion(q);
    const answer = await ask(
      "\n[a]provar, [r]ejeitar, [e]ditar texto, [p]ular pro próximo, [q]uit: "
    );

    if (answer === "q") break;
    if (answer === "p" || answer === "") continue;

    if (answer === "e") {
      console.log(
        "Cole o enunciado corrigido (linha vazia pra manter o atual):"
      );
      const newStem = await ask("> ");
      if (newStem) q.stem_text = newStem;
      for (const letter of ["A", "B", "C", "D", "E"] as const) {
        const newAlt = await ask(
          `${letter}) atual: "${q.alternatives[letter]}" — novo (enter mantém): `
        );
        if (newAlt) q.alternatives[letter] = newAlt;
      }
      printQuestion(q);
      const confirm = await ask("\nAprovar com essa correção? [s/n]: ");
      if (confirm.toLowerCase() !== "s") {
        console.log("Descartado sem salvar.");
        continue;
      }
    } else if (answer !== "a") {
      rejected++;
      continue;
    }

    const { error } = await admin.from("public_questions").insert({
      origin: "enem",
      exam_year: q.year,
      exam_label: `ENEM ${q.year}`,
      item_number: q.item_number,
      area: q.area,
      subject: "math",
      concept_id: q.concept_id,
      grade_year: q.grade_year,
      difficulty: q.difficulty,
      stem: [{ type: "text", text: q.stem_text }],
      alternatives: (["A", "B", "C", "D", "E"] as const).map((letter) => ({
        letter,
        text: q.alternatives[letter],
      })),
      correct_letter: q.correct_letter,
      source: {
        url: `https://download.inep.gov.br/enem/provas_e_gabaritos/${q.year}_PV_impresso_D2_CD5.pdf`,
        license:
          "Prova oficial do INEP, uso educacional — ver docs/HANDOFF.md.",
        attribution: `INEP — ENEM ${q.year}, questão ${q.item_number}`,
      },
      review_status: "approved",
      tagging: {
        model: "claude-sonnet-4-5",
        confidence: q.tagger_confidence,
        notes: q.tagger_notes,
        reviewed_by: "human",
      },
    });

    if (error) {
      console.error(
        `  erro ao inserir item ${q.item_number}: ${error.message}`
      );
      continue;
    }
    approved++;
  }

  rl.close();
  writeFileSync(
    join(dir, "tagged-matematica.json"),
    JSON.stringify(tagged, null, 2)
  );

  console.log(
    `\nFim: ${approved} aprovadas, ${rejected} rejeitadas, ${skippedImage} puladas (precisam de imagem), ${skippedDone} já estavam no banco.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
