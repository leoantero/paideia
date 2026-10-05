import { admin } from "./lib/admin";
import { cardConceptCode, cardId, loadDecks } from "./lib/decks";

/**
 * Seed dos baralhos curados (content/decks/*.json). Idempotente.
 *
 * O `reviewStatus` vai como está no JSON: baralho redigido com ajuda de IA
 * entra 'pending_review' e o aluno não vê até um professor revisar e trocar
 * para 'approved' (CLAUDE.md: nenhum conteúdo gerado por IA sem revisão).
 *
 * Rode depois de `seed:curriculum` — o `conceptCode` dos cards é resolvido
 * contra os conceitos que ele grava.
 */
async function main() {
  const decks = loadDecks();

  const codes = [
    ...new Set(
      decks.flatMap((d) => d.cards.map((_, i) => cardConceptCode(d, i)))
    ),
  ].filter((c): c is string => c !== null);

  const { data: concepts, error } = await admin
    .from("concepts")
    .select("id, code")
    .in("code", codes);
  if (error) throw error;
  const conceptIdByCode = new Map(
    (concepts ?? []).map((c) => [c.code as string, c.id as string])
  );
  const missing = codes.filter((c) => !conceptIdByCode.has(c));
  if (missing.length > 0) {
    throw new Error(
      `Conceitos não encontrados (rode npm run seed:curriculum): ${missing.join(", ")}`
    );
  }

  for (const deck of decks) {
    const { error: deckErr } = await admin.from("decks").upsert({
      id: deck.id,
      title: deck.title,
      subject: deck.subject,
      grade_level: deck.gradeLevel,
      description: deck.description,
      bncc_codes: deck.bnccCodes,
      sources: deck.sources,
      review_status: deck.reviewStatus,
    });
    if (deckErr) throw deckErr;

    const rows = deck.cards.map((card, i) => {
      const code = cardConceptCode(deck, i);
      return {
        id: cardId(deck.id, i + 1),
        deck_id: deck.id,
        concept_id: code ? conceptIdByCode.get(code)! : null,
        position: i + 1,
        kind: card.kind,
        prompt: card.prompt,
        answer: card.answer,
        choices: card.kind === "multiple_choice" ? card.choices : null,
        correct_choice:
          card.kind === "multiple_choice" ? card.correctChoice : null,
        accepted_answers:
          card.kind === "short_answer" ? card.acceptedAnswers : null,
      };
    });
    const { error: cardErr } = await admin.from("cards").upsert(rows);
    if (cardErr) throw cardErr;

    // card removido do JSON sai do banco (e o estado SM-2 dele, em cascata)
    const { error: delErr } = await admin
      .from("cards")
      .delete()
      .eq("deck_id", deck.id)
      .gt("position", deck.cards.length);
    if (delErr) throw delErr;

    const anchored = rows.filter((r) => r.concept_id).length;
    console.log(
      `  ${deck.id.padEnd(26)} ${String(rows.length).padStart(2)} cards · ` +
        `${String(anchored).padStart(2)} ancorados · ${deck.reviewStatus}`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
