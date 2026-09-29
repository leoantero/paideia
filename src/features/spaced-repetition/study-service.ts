import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeckOverview, ReviewGrade, ReviewResult, StudyCard } from "./types";

/**
 * Thin wrappers over the spaced-repetition RPCs. Scheduling, grading of
 * objective cards and rewards all happen in Postgres (0009_spaced_repetition.sql)
 * so the client can never forge them.
 */

export async function getStudyQueue(
  supabase: SupabaseClient,
  deckId: string | null
): Promise<StudyCard[]> {
  const { data, error } = await supabase.rpc("get_study_queue", { p_deck_id: deckId });
  if (error) throw new Error(`get_study_queue failed: ${error.message}`);
  return (data ?? []) as StudyCard[];
}

export async function getDeckOverview(supabase: SupabaseClient): Promise<DeckOverview[]> {
  const { data, error } = await supabase.rpc("get_deck_overview");
  if (error) throw new Error(`get_deck_overview failed: ${error.message}`);
  return (data ?? []) as DeckOverview[];
}

export async function recordReview(
  supabase: SupabaseClient,
  params: {
    cardId: string;
    response?: string | null;
    openGrade?: ReviewGrade | null;
    durationMs: number;
  }
): Promise<ReviewResult> {
  const { data, error } = await supabase.rpc("record_review", {
    p_card_id: params.cardId,
    p_response: params.response ?? null,
    p_open_grade: params.openGrade ?? null,
    p_duration_ms: Math.round(params.durationMs),
  });
  if (error) throw new ReviewRejectedError(error.message);
  return data as ReviewResult;
}

/** The database refused the review (card not due, daily limit, etc.). */
export class ReviewRejectedError extends Error {}

/** Reads one approved card's question and reference answer (RLS: approved decks only). */
export async function getCardForEvaluation(
  supabase: SupabaseClient,
  cardId: string
): Promise<{ prompt: string; answer: string; kind: string } | null> {
  const { data } = await supabase
    .from("cards")
    .select("prompt, answer, kind")
    .eq("id", cardId)
    .maybeSingle();
  return data;
}
