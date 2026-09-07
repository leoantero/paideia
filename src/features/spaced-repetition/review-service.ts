import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Monta os baralhos de revisão A PARTIR DO LEARNING GRAPH.
 *
 * O que está vencido não é uma lista fixa: sai de `concept_mastery.next_review_at`,
 * que por sua vez vem do MESMO posterior do BKT que alimenta o diagnóstico
 * (ver bkt.ts, nextReview()). Repetição espaçada e diagnóstico são a mesma
 * inferência — não duas features com dois estados que divergem.
 *
 * Conceito nunca estudado conta como vencido: é exatamente o que o aluno
 * precisa ver primeiro.
 */

export interface ReviewCard {
  id: string;
  front: string;
  back: string;
}

export interface ReviewDeck {
  conceptId: string;
  conceptCode: string;
  conceptName: string;
  cards: ReviewCard[];
  /** true = vencido (ou nunca estudado) */
  due: boolean;
  /** null = sem evidência ainda */
  masteryPct: number | null;
}

export interface ReviewSubject {
  subject: string;
  decks: ReviewDeck[];
  dueDecks: number;
  totalCards: number;
}

export async function getReviewSubjects(
  supabase: SupabaseClient,
  studentId: string
): Promise<ReviewSubject[]> {
  const [{ data: cards }, { data: mastery }] = await Promise.all([
    supabase
      .from("concept_cards")
      .select("id, front, back, position, concepts(id, code, name, subject)")
      .order("position"),
    supabase
      .from("concept_mastery")
      .select("concept_id, mastery, next_review_at, evidence_count")
      .eq("student_id", studentId),
  ]);

  type CardRow = {
    id: string;
    front: string;
    back: string;
    position: number;
    concepts:
      | { id: string; code: string; name: string; subject: string }
      | { id: string; code: string; name: string; subject: string }[]
      | null;
  };

  const masteryByConcept = new Map(
    (mastery ?? []).map((m) => [
      m.concept_id as string,
      {
        mastery: m.mastery as number,
        nextReviewAt: m.next_review_at as string | null,
        evidenceCount: m.evidence_count as number,
      },
    ])
  );

  const now = Date.now();
  // Estado local da requisição — nunca em escopo de módulo: o servidor Next
  // reaproveita o processo entre requisições de alunos diferentes.
  const deckByConcept = new Map<
    string,
    { deck: ReviewDeck; subject: string }
  >();

  for (const row of (cards ?? []) as CardRow[]) {
    const concept = Array.isArray(row.concepts)
      ? row.concepts[0]
      : row.concepts;
    if (!concept) continue;

    let entry = deckByConcept.get(concept.id);
    if (!entry) {
      const m = masteryByConcept.get(concept.id);
      const due =
        !m || m.evidenceCount === 0 || !m.nextReviewAt
          ? true
          : new Date(m.nextReviewAt).getTime() <= now;

      entry = {
        subject: concept.subject,
        deck: {
          conceptId: concept.id,
          conceptCode: concept.code,
          conceptName: concept.name,
          cards: [],
          due,
          masteryPct:
            m && m.evidenceCount > 0 ? Math.round(m.mastery * 100) : null,
        },
      };
      deckByConcept.set(concept.id, entry);
    }
    entry.deck.cards.push({ id: row.id, front: row.front, back: row.back });
  }

  const bySubject = new Map<string, ReviewDeck[]>();
  for (const { deck, subject } of deckByConcept.values()) {
    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject)!.push(deck);
  }

  return [...bySubject.entries()]
    .map(([subject, decks]) => {
      // vencidos primeiro, depois por menor domínio — o que mais precisa, no topo
      decks.sort((a, b) => {
        if (a.due !== b.due) return a.due ? -1 : 1;
        return (a.masteryPct ?? 0) - (b.masteryPct ?? 0);
      });
      return {
        subject,
        decks,
        dueDecks: decks.filter((d) => d.due).length,
        totalCards: decks.reduce((acc, d) => acc + d.cards.length, 0),
      };
    })
    .sort((a, b) => b.dueDecks - a.dueDecks);
}
