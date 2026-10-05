import "server-only";
import { createAdminClient } from "@/src/lib/supabase/admin";

/**
 * Teto de uso nas rotas que chamam a Anthropic: por rota/hora, por
 * usuário/dia e global/dia — decidido atomicamente por ai_guard() (0025),
 * que também registra o alerta que separa aluno de meliante.
 *
 * Por que existe: com a base fechada (sem cadastro público, credenciais
 * fixas distribuídas — ver docs/DEPLOY.md), o risco que resta não é estranho
 * criando conta, é uma credencial conhecida vazando ou um script em loop
 * contra o tutor. Sem teto isso é fatura sem limite, não é hipotético.
 *
 * Por que Postgres e não Redis/Upstash: o projeto já tem um Postgres pago e
 * já usa o cliente service-role pra escrita privilegiada (admin.ts). Somar
 * outro serviço externo só pra isso é complexidade que a escala atual não
 * paga. Troque por um store dedicado quando o volume justificar.
 */

export type LimitKind = "hourly_limit" | "daily_limit" | "global_limit";

export interface RateLimitResult {
  allowed: boolean;
  /** só presentes quando allowed=false */
  kind?: LimitKind;
  retryAfterSeconds?: number;
}

/**
 * Best-effort: nunca derruba a rota chamadora se o próprio controle falhar.
 * `limit`/`windowMinutes` são o teto POR HORA desta rota; os tetos diários
 * moram no banco (ai_usage_limits), iguais para todas as rotas.
 */
export async function checkRateLimit(
  userId: string,
  route: string,
  limit: number,
  windowMinutes: number
): Promise<RateLimitResult> {
  // a janela por rota é sempre de 1h no banco; tetos de outras janelas são
  // normalizados para "por hora" para não mudar o contrato das rotas
  const hourlyLimit = Math.max(1, Math.round((limit * 60) / windowMinutes));

  try {
    const { data, error } = await createAdminClient().rpc("ai_guard", {
      p_user: userId,
      p_route: route,
      p_hourly_limit: hourlyLimit,
    });
    if (error) throw error;

    const decision = data as {
      allowed: boolean;
      kind?: LimitKind;
      retry_after_seconds?: number;
    };
    if (decision.allowed) return { allowed: true };

    console.warn(`[rate-limit] ${decision.kind} em ${route}`);
    return {
      allowed: false,
      kind: decision.kind,
      retryAfterSeconds: decision.retry_after_seconds ?? 60,
    };
  } catch (err) {
    // Falha do controle não pode derrubar a experiência do usuário. Registra
    // e deixa passar — é o mesmo trade-off de recordEvidence(): perder um
    // controle de custo é ruim, derrubar a aula do aluno é pior.
    console.warn(
      `[rate-limit] falhou (não-fatal) para ${route}: ${(err as Error).message}`
    );
    return { allowed: true };
  }
}

const LIMIT_MESSAGES: Record<LimitKind, (minutes: number) => string> = {
  hourly_limit: (m) =>
    `Muitas mensagens em pouco tempo. Tente de novo em ${m} minuto(s).`,
  daily_limit: () =>
    "Você chegou ao limite de uso de hoje. Amanhã tem mais — bom descanso!",
  global_limit: () =>
    "O tutor está indisponível no momento. Tente de novo mais tarde.",
};

export function rateLimitResponse(
  retryAfterSeconds: number,
  kind: LimitKind = "hourly_limit"
): Response {
  const minutes = Math.ceil(retryAfterSeconds / 60) || 1;
  return new Response(
    JSON.stringify({ error: LIMIT_MESSAGES[kind](minutes) }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
