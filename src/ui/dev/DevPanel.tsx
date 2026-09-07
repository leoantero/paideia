"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { ROLE_HOME, ROLE_LABEL, type Role } from "@/src/core/auth/types";
import type { DemoAccount } from "@/src/features/dev/dev-access";
import { Button, Callout, Input, Segmented } from "@/src/ui/kit";

const ROLE_TONE: Record<Role, string> = {
  student: "border-ink/25 bg-ink-soft/20",
  parent: "border-gold/40 bg-parchment",
  teacher: "border-strong/30 bg-strong-bg",
  director: "border-mist bg-mist-soft",
};

export function DevPanel({
  accounts,
  password,
  createAction,
}: {
  accounts: DemoAccount[];
  password: string;
  createAction: (
    role: Role,
    name: string
  ) => Promise<{ email: string } | { error: string }>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<Role>("student");
  const [newName, setNewName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /** Entra de verdade: mesma senha da demo, mesmo fluxo de login do usuário. */
  async function enterAs(account: DemoAccount) {
    setError(null);
    setBusy(account.id);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password,
    });
    if (signInError) {
      setBusy(null);
      setError(
        `Não consegui entrar como ${account.fullName}: ${signInError.message}`
      );
      return;
    }
    // Navegação DURA de propósito. Com router.push, a requisição RSC sai na
    // mesma tick em que o cliente ainda está gravando o cookie da sessão nova
    // — o servidor recebe a sessão antiga, requireRole barra, e o clique
    // parece não fazer nada. Recarregar garante que o cookie novo vai junto.
    window.location.assign(ROLE_HOME[account.role] ?? "/");
  }

  function create() {
    const name = newName.trim();
    if (!name) {
      setError("Dê um nome à conta de teste.");
      return;
    }
    setError(null);
    setCreated(null);
    startTransition(async () => {
      const result = await createAction(newRole, name);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setCreated(result.email);
      setNewName("");
      router.refresh();
    });
  }

  const byRole = accounts.reduce<Record<string, DemoAccount[]>>((acc, a) => {
    (acc[a.role] ??= []).push(a);
    return acc;
  }, {});

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-6 px-6 py-10">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-md bg-weak px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wide text-white">
            Para devs
          </span>
          <Link href="/" className="text-[13px] text-muted hover:text-ink">
            ← início
          </Link>
        </div>
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">
          Entrar como qualquer perfil
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          Atalho de demonstração: entra numa conta real da base de teste, com o
          mesmo login que o usuário usaria. Serve para ver os quatro apps sem
          precisar de quatro navegadores.
        </p>
      </div>

      <Callout>
        <strong>
          Esta tela é a vulnerabilidade que fechamos, de propósito.
        </strong>{" "}
        Ela só existe porque{" "}
        <code className="font-mono text-[12px]">PAIDEIA_DEV_PANEL=1</code> está
        no ambiente. Sem a variável a rota responde 404. No dia em que existir
        aluno de verdade na base, tire a variável do ambiente.
      </Callout>

      {error && (
        <p role="alert" className="text-sm font-medium text-weak">
          {error}
        </p>
      )}

      {/* ── contas existentes ───────────────────────────────── */}
      <section className="flex flex-col gap-4">
        {(["student", "parent", "teacher", "director"] as Role[]).map(
          (role) => {
            const list = byRole[role] ?? [];
            if (list.length === 0) return null;
            return (
              <div key={role}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
                  {ROLE_LABEL[role]}
                </div>
                <div className="flex flex-col gap-2">
                  {list.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => enterAs(a)}
                      disabled={busy !== null}
                      className={`flex items-center justify-between rounded-[12px] border-[1.5px] px-4 py-3 text-left transition-colors hover:border-ink disabled:opacity-50 ${ROLE_TONE[role]}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">
                          {a.fullName}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-muted">
                          {a.scope}
                        </span>
                      </span>
                      <span className="ml-3 shrink-0 font-display text-[12px] font-bold text-ink">
                        {busy === a.id ? "entrando…" : "entrar →"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          }
        )}
      </section>

      {/* ── criar nova ──────────────────────────────────────── */}
      <section className="rounded-[14px] border border-line bg-surface p-[18px]">
        <h2 className="font-display text-[16px] font-bold text-ink">
          Criar uma conta de teste
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          A conta já nasce com escopo — matrícula, vínculo ou turma conforme o
          perfil — senão ela entra e vê tela vazia.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <Segmented
            value={newRole}
            onChange={setNewRole}
            options={(
              ["student", "parent", "teacher", "director"] as Role[]
            ).map((r) => ({
              value: r,
              label: ROLE_LABEL[r],
            }))}
          />
          <Input
            placeholder="Nome da pessoa (ex: Ana Testadora)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button onClick={create} disabled={pending}>
            {pending ? "Criando…" : "Criar e listar acima"}
          </Button>
        </div>

        {created && (
          <p className="mt-3 rounded-[10px] bg-strong-bg px-3.5 py-2.5 text-[13px] text-ink">
            Criada: <span className="font-mono text-[12px]">{created}</span> —
            já aparece na lista acima.
          </p>
        )}
      </section>

      <p className="pb-4 text-center text-xs text-faint">
        Todas as contas usam a senha{" "}
        <span className="font-mono">{password}</span>
      </p>
    </main>
  );
}
