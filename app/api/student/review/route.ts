import { after, NextResponse } from "next/server";
import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { recordEvidence } from "@/src/features/learning-graph/evidence-recorder";

/**
 * Uma resposta de card de revisão vira evidência `retrieval_review`.
 *
 * Por que confidence 0.9: diferente do chat (ruidoso, teto 0.6), aqui o sinal
 * é limpo — o aluno viu a pergunta, tentou lembrar e declarou o resultado.
 * É a segunda melhor evidência que existe, atrás só de item de avaliação.
 *
 * O aluno NÃO manda confidence, signal nem student_id: tudo é derivado no
 * servidor a partir de `known` e da sessão autenticada. Antes de 0013 a
 * escrita de evidência era uma RPC aberta ao cliente, e por isso forjável.
 */
export async function POST(request: Request) {
  const { supabase, user } = await getVerifiedUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") {
    return NextResponse.json(
      { error: "Only students can record reviews." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const cardId: string | undefined = body?.cardId;
  const known: unknown = body?.known;

  if (!cardId || typeof known !== "boolean") {
    return NextResponse.json(
      { error: "cardId and known are required." },
      { status: 400 }
    );
  }

  // O conceito vem do CARD no banco, nunca do corpo da requisição — senão o
  // cliente escolheria em qual conceito quer creditar a resposta.
  const { data: card } = await supabase
    .from("concept_cards")
    .select("id, concept_id, concepts(intrinsic_difficulty)")
    .eq("id", cardId)
    .maybeSingle();

  if (!card) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  const conceptRel = Array.isArray(card.concepts)
    ? card.concepts[0]
    : card.concepts;
  const difficulty =
    (conceptRel?.intrinsic_difficulty as number | undefined) ?? 0.5;

  // Fora do caminho crítico: o aluno já pode virar o próximo card enquanto o
  // BKT recomputa. Falha aqui nunca chega à tela.
  after(async () => {
    await recordEvidence(user.id, [
      {
        concept_id: card.concept_id as string,
        source: "retrieval_review",
        signal: known ? "correct" : "incorrect",
        confidence: 0.9,
        difficulty,
        source_ref: cardId,
        metadata: { via: "revisao" },
      },
    ]);
  });

  return NextResponse.json({ ok: true });
}
