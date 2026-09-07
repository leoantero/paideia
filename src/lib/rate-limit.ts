import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

/**
 * Teto de uso por usuário nas 4 rotas que chamam a Anthropic.
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

export interface RateLimitResult {
  allowed: boolean;
  /** só presente quando allowed=false */
  retryAfterSeconds?: number;
}

/** Best-effort: nunca derruba a rota chamadora se o próprio controle falhar. */
export async function checkRateLimit(
  userId: string,
  route: string,
  limit: number,
  windowMinutes: number
): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const windowStart = new Date(
    Date.now() - windowMinutes * 60_000
  ).toISOString();

  try {
    const { count, error: countError } = await admin
      .from("ai_route_calls")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("route", route)
      .gte("created_at", windowStart);

    if (countError) throw countError;

    if ((count ?? 0) >= limit) {
      const { data: oldest } = await admin
        .from("ai_route_calls")
        .select("created_at")
        .eq("user_id", userId)
        .eq("route", route)
        .gte("created_at", windowStart)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const resetAt = oldest
        ? new Date(oldest.created_at as string).getTime() +
          windowMinutes * 60_000
        : Date.now() + windowMinutes * 60_000;

      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((resetAt - Date.now()) / 1000)
        ),
      };
    }

    const { error: insertError } = await admin
      .from("ai_route_calls")
      .insert({ user_id: userId, route });
    if (insertError) throw insertError;

    // Limpeza oportunista, fora do caminho crítico — a tabela não tem cron
    // de retenção, e isso evita crescimento sem fim sem precisar de um.
    after(async () => {
      await admin
        .from("ai_route_calls")
        .delete()
        .lt("created_at", new Date(Date.now() - 2 * 60 * 60_000).toISOString())
        .then(
          () => {},
          () => {}
        );
    });

    return { allowed: true };
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

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({
      error: `Muitas mensagens em pouco tempo. Tente de novo em ${Math.ceil(retryAfterSeconds / 60) || 1} minuto(s).`,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
