import { notFound } from "next/navigation";
import {
  DEMO_PASSWORD,
  createTestAccount,
  isDevPanelEnabled,
  listDemoAccounts,
} from "@/src/features/dev/dev-access";
import type { Role } from "@/src/core/auth/types";
import { DevPanel } from "@/src/ui/dev/DevPanel";

export const dynamic = "force-dynamic";

/**
 * Rota de demonstração. 404 quando PAIDEIA_DEV_PANEL não está ligado — 404 e
 * não redirect, porque redirect confirmaria que a rota existe.
 */
export default async function DevPage() {
  if (!isDevPanelEnabled()) notFound();

  const accounts = await listDemoAccounts();

  async function create(role: Role, name: string) {
    "use server";
    // o portão é reavaliado aqui: a server action é um endpoint próprio e
    // não herda a checagem que rodou na renderização da página
    if (!isDevPanelEnabled()) return { error: "Painel desativado." };
    try {
      return await createTestAccount(role, name);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Falhou ao criar." };
    }
  }

  return (
    <DevPanel
      accounts={accounts}
      password={DEMO_PASSWORD}
      createAction={create}
    />
  );
}
