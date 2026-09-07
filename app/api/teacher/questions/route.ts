import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

/**
 * Grava no banco de questões a questão que o professor REVISOU e aprovou.
 * Escrita passa pela sessão dele — RLS (`questions_owner_all`) garante que
 * author_id é ele mesmo.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") {
    return NextResponse.json(
      { error: "Only teachers can save questions." },
      { status: 403 }
    );
  }

  const b = await request.json().catch(() => null);
  if (!b?.stem || !b?.answer_key || !b?.type) {
    return NextResponse.json(
      { error: "Question is incomplete." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("questions")
    .insert({
      author_id: user.id,
      concept_id: b.conceptId ?? null,
      type: b.type,
      difficulty: Math.min(Math.max(Number(b.difficulty ?? 0.5), 0), 1),
      stem: b.stem,
      options: b.options ?? null,
      answer_key: b.answer_key,
      rationale: b.rationale ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[teacher/questions] insert falhou:", error.message);
    return NextResponse.json(
      { error: "Não consegui salvar a questão." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}
