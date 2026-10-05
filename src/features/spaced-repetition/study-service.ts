import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordEvidence } from "@/src/features/learning-graph/evidence-recorder";
import { reviewToEvidence } from "./review-evidence";
import type {
  DeckOverview,
  ReviewGrade,
  ReviewResult,
  StudyCard,
} from "./types";

/**
 * Thin wrappers over the spaced-repetition RPCs. Scheduling, grading of
 * objective cards and rewards all happen in Postgres (0021_spaced_repetition.sql)
 * so the client can never forge them.
 */

export async function getStudyQueue(
  supabase: SupabaseClient,
  deckId: string | null
): Promise<StudyCard[]> {
  const { data, error } = await supabase.rpc("get_study_queue", {
    p_deck_id: deckId,
  });
  if (error) throw new Error(`get_study_queue failed: ${error.message}`);
  return (data ?? []) as StudyCard[];
}

export async function getDeckOverview(
  supabase: SupabaseClient
): Promise<DeckOverview[]> {
  const { data, error } = await supabase.rpc("get_deck_overview");
  if (error) throw new Error(`get_deck_overview failed: ${error.message}`);
  return (data ?? []) as DeckOverview[];
}

/**
 * Records the review, then — off the critical path — turns it into learning
 * graph evidence. The evidence write is server-only (service-role inside
 * evidence-recorder.ts) and the student id comes from the session, never the
 * request body (CLAUDE.md §9.5).
 */
export async function recordReview(
  supabase: SupabaseClient,
  studentId: string,
  params: {
    cardId: string;
    response?: string | null;
    /** Open cards (Socratic evaluation) and flashcards (self-assessment). */
    grade?: ReviewGrade | null;
    durationMs: number;
  },
  via: string
): Promise<ReviewResult> {
  const { data, error } = await supabase.rpc("record_review", {
    p_card_id: params.cardId,
    p_response: params.response ?? null,
    p_grade: params.grade ?? null,
    p_duration_ms: Math.round(params.durationMs),
  });
  if (error) throw new ReviewRejectedError(error.message);
  const result = data as ReviewResult;

  const event = reviewToEvidence(result, via);
  if (event) after(() => recordEvidence(studentId, [event]));

  return result;
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
