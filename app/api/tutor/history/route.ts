import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * Mensagens de uma conversa do aluno logado. RLS em `messages`/`conversations`
 * garante que só as conversas do próprio aluno voltam, mesmo sem filtro manual.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const conversationId = new URL(request.url).searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}
