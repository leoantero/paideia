import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordEvidence } from "@/src/features/learning-graph/evidence-recorder";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { answerToEvidence } from "./question-evidence";
import type {
  AnswerResult,
  Letter,
  QuestionArea,
  QuestionOverview,
  QuestionTutorContext,
  ServedQuestion,
} from "./types";

/**
 * Wrappers finos sobre as RPCs de 0026. Correção, gabarito e recompensa
 * ficam no Postgres; o cliente nunca vê `correct_letter` antes da hora.
 */

export async function getQuestionOverview(
  supabase: SupabaseClient,
  area: QuestionArea
): Promise<QuestionOverview> {
  const { data, error } = await supabase.rpc("get_question_overview", {
    p_area: area,
  });
  if (error) throw new Error(`get_question_overview failed: ${error.message}`);
  return data as QuestionOverview;
}

export async function getQuestionSet(
  supabase: SupabaseClient,
  area: QuestionArea,
  conceptId: string | null
): Promise<ServedQuestion[]> {
  const { data, error } = await supabase.rpc("get_question_set", {
    p_area: area,
    p_concept_id: conceptId,
    p_limit: 10,
  });
  if (error) throw new Error(`get_question_set failed: ${error.message}`);
  return (data ?? []) as ServedQuestion[];
}

/**
 * Corrige e, fora do caminho crítico, grava a evidência `assessment_item`.
 * O id do aluno vem da sessão (CLAUDE.md §9.5), nunca do corpo.
 */
export async function answerQuestion(
  supabase: SupabaseClient,
  studentId: string,
  params: { questionId: string; letter: Letter; durationMs: number }
): Promise<AnswerResult> {
  const { data, error } = await supabase.rpc("answer_question", {
    p_question_id: params.questionId,
    p_letter: params.letter,
    p_duration_ms: Math.round(params.durationMs),
  });
  if (error) throw new QuestionRejectedError(error.message);
  const result = data as AnswerResult;

  const event = answerToEvidence(result, result.origin);
  if (event) after(() => recordEvidence(studentId, [event]));

  return result;
}

export async function revealAnswer(
  supabase: SupabaseClient,
  attemptId: string
): Promise<{ attempt_id: string; correct_letter: Letter }> {
  const { data, error } = await supabase.rpc("reveal_question_answer", {
    p_attempt_id: attemptId,
  });
  if (error) throw new QuestionRejectedError(error.message);
  return data as { attempt_id: string; correct_letter: Letter };
}

/**
 * Contexto da tentativa COM o gabarito, para o prompt do tutor. Lido com
 * service-role porque nenhuma RPC acessível ao aluno pode devolver o
 * gabarito; a função confere que a tentativa é do aluno da sessão.
 */
export async function getQuestionTutorContext(
  attemptId: string,
  studentId: string
): Promise<QuestionTutorContext | null> {
  const { data, error } = await createAdminClient().rpc(
    "question_tutor_context",
    { p_attempt_id: attemptId, p_student: studentId }
  );
  if (error) throw new Error(`question_tutor_context failed: ${error.message}`);
  return (data as QuestionTutorContext | null) ?? null;
}

/** O banco recusou (questão indisponível, alternativa inválida, etc.). */
export class QuestionRejectedError extends Error {}
