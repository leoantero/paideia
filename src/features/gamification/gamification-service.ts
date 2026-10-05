import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Leaderboard, StudentProgress } from "./types";

export async function getMyProgress(
  supabase: SupabaseClient
): Promise<StudentProgress> {
  const { data, error } = await supabase.rpc("get_my_progress");
  if (error) throw new Error(`get_my_progress failed: ${error.message}`);
  return data as StudentProgress;
}

export async function getClassLeaderboard(
  supabase: SupabaseClient
): Promise<Leaderboard> {
  const { data, error } = await supabase.rpc("get_class_leaderboard");
  if (error) throw new Error(`get_class_leaderboard failed: ${error.message}`);
  return data as Leaderboard;
}

export async function buyStreakFreeze(
  supabase: SupabaseClient
): Promise<{ coins: number; streak_freezes: number }> {
  const { data, error } = await supabase.rpc("buy_streak_freeze");
  if (error) throw new PurchaseRejectedError(error.message);
  return data;
}

export class PurchaseRejectedError extends Error {}

/** Non-fatal: a failed reward must never break the tutoring chat. */
export async function rewardTutorSession(
  supabase: SupabaseClient,
  conversationId: string
): Promise<{ awarded: boolean; points?: number; coins?: number }> {
  const { data, error } = await supabase.rpc("reward_tutor_session", {
    p_conversation_id: conversationId,
  });
  if (error) {
    console.warn(
      `[gamification] reward_tutor_session failed: ${error.message}`
    );
    return { awarded: false };
  }
  return data;
}
