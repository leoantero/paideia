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
export async function loadAuthUsers(): Promise<
  Map<string, { id: string; email?: string }>
> {
  const map = new Map<string, { id: string; email?: string }>();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    for (const u of data.users) if (u.email) map.set(u.email.toLowerCase(), u);
    if (data.users.length < 200) break;
    page += 1;
  }
  return map;
}

/**
 * Cria o usuário se não existir; devolve o id em qualquer caso.
 *
 * O PAPEL VAI EM `app_metadata`, não em `user_metadata` — e isso não é
 * detalhe de estilo. `user_metadata` é o que o próprio usuário manda no
 * signUp e pode reescrever depois; `app_metadata` só a service-role grava.
 * handle_new_user() (0013) lê o papel exclusivamente de lá, então provisionar
 * pelo campo errado cria um aluno, não um professor. Ver
 * supabase/migrations/0013_harden_privileges.sql.
 */
export async function ensureUser(
  existing: Map<string, { id: string }>,
  email: string,
  password: string,
  metadata: { role: string; full_name?: string }
): Promise<string> {
  const hit = existing.get(email.toLowerCase());
  if (hit) return hit.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: metadata.role },
    user_metadata: { full_name: metadata.full_name ?? null },
  });
  if (error || !data.user)
    throw error ?? new Error(`createUser falhou: ${email}`);

  // Confirmação explícita do papel em vez de confiar no timing do trigger.
  // O GoTrue aplica o app_metadata num UPDATE depois do INSERT, então o
  // trigger de criação sozinho já entregou conta de gestor com papel de aluno
  // (ver 0017). O seed não pode depender dessa ordem.
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: metadata.role })
    .eq("id", data.user.id);
  if (roleError) throw roleError;

  existing.set(email.toLowerCase(), data.user);
  return data.user.id;
}

/** Domínios das contas fictícias da demo — os únicos que os scripts tocam. */
export const DEMO_EMAIL_DOMAINS = [
  "aluno.paideia.app",
  "exemplo.com",
  "escola-demo.com",
];

/**
 * Senha única das contas da demo. Fica SÓ no .env.local (e nunca no
 * repositório): desde a demo pública, quem tem a URL e uma matrícula não pode
 * conseguir a senha lendo o GitHub.
 */
export function demoPassword(): string {
  const pw = process.env.PAIDEIA_DEMO_PASSWORD;
  if (!pw || pw.length < 12) {
    throw new Error(
      "Defina PAIDEIA_DEMO_PASSWORD (12+ caracteres) no .env.local."
    );
  }
  return pw;
}
