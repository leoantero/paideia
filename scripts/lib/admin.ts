import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Scripts run outside Next, so .env.local isn't loaded automatically.
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local"
  );
}

/**
 * Cliente com a service-role key — ignora RLS. USO EXCLUSIVO de scripts de
 * seed/manutenção rodados à mão por um dev. Nunca importe isto em código de
 * app (`src/`, `app/`).
 */
export const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Mapa email -> user, carregado uma vez. Torna os seeds idempotentes. */
export async function loadAuthUsers(): Promise<Map<string, { id: string; email?: string }>> {
  const map = new Map<string, { id: string; email?: string }>();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) if (u.email) map.set(u.email.toLowerCase(), u);
    if (data.users.length < 200) break;
    page += 1;
  }
  return map;
}

/** Cria o usuário se não existir; devolve o id em qualquer caso. */
export async function ensureUser(
  existing: Map<string, { id: string }>,
  email: string,
  password: string,
  metadata: Record<string, unknown>
): Promise<string> {
  const hit = existing.get(email.toLowerCase());
  if (hit) return hit.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error || !data.user) throw error ?? new Error(`createUser falhou: ${email}`);
  existing.set(email.toLowerCase(), data.user);
  return data.user.id;
}
