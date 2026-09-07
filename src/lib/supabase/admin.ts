import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente service-role do SERVIDOR. Ignora RLS.
 *
 * ESCOPO DE USO — deliberadamente estreito:
 *   Só para ESCREVER estado derivado do learning graph (learning_events,
 *   concept_mastery), sempre com um student_id que veio da sessão autenticada
 *   da requisição, e sempre fora do caminho crítico (dentro de `after()`).
 *
 * POR QUE EXISTE: a escrita do learning graph não pode ficar ao alcance do
 * cliente. Enquanto ela era uma RPC `security definer` liberada para
 * `authenticated`, o próprio aluno conseguia forjar evidência ("insight" com
 * confidence alta) ou escrever mastery direto — quebrando a propriedade que
 * sustenta o contrato com a rede: o número ser derivado de evidência real.
 * Ver supabase/migrations/0013_harden_privileges.sql.
 *
 * O QUE NUNCA FAZER AQUI:
 *   - Ler dado de aluno para renderizar tela. Leitura continua passando pelo
 *     cliente de sessão (src/lib/supabase/server.ts), onde a RLS é a fronteira.
 *   - Aceitar um student_id vindo do corpo da requisição. Sempre o da sessão.
 */
let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente — a instrumentação do learning graph precisa dela."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
