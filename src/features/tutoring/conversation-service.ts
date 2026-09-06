import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TutorMessage } from "@/src/core/ai-integration/anthropic-client";

/**
 * All reads/writes here go through the caller-supplied Supabase client,
 * which carries the signed-in student's session — RLS policies on
 * `conversations`/`messages` (supabase/migrations/0004_conversations_messages.sql)
 * naturally scope every query to that student. No manual `student_id`
 * filtering is needed or should be added here; RLS is the actual boundary.
 */

export interface ConversationRow {
  id: string;
  student_id: string;
  subject: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: "student" | "assistant";
  content: string;
  created_at: string;
}

const HISTORY_LIMIT = 10;

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  studentId: string,
  conversationId: string | null,
  subject: string
): Promise<ConversationRow> {
  if (conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();
    if (!error && data) return data as ConversationRow;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ student_id: studentId, subject })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message}`);
  }
  return data as ConversationRow;
}

/** Fetches the last N messages, oldest-first, for building LLM context. */
export async function getRecentMessages(
  supabase: SupabaseClient,
  conversationId: string
): Promise<TutorMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !data) return [];

  return data
    .reverse()
    .map((m) => ({
      role: m.role === "student" ? "user" : "assistant",
      content: m.content,
    }));
}

/** Returns the new message's id — the tagger anchors evidence to it via `source_ref`. */
export async function appendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: "student" | "assistant",
  content: string
): Promise<string> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role, content })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist message: ${error?.message}`);
  }

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data.id as string;
}
