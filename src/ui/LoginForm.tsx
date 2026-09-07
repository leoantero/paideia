"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { ROLE_HOME, matriculaToEmail, type Role } from "@/src/core/auth/types";
import { Button, ErrorText } from "@/src/ui/kit";

interface RoleConfig {
  title: string;
  subtitle: string;
  identifier: "matricula" | "email";
  fieldLabel: string;
  fieldType: string;
  placeholder: string;
  hint?: { tone: "warm" | "cool"; text: string };
}

const CONFIG: Record<Role, RoleConfig> = {
  student: {
    title: "Entrar como aluno",
    subtitle: "Use sua matrícula escolar para acessar.",
    identifier: "matricula",
    fieldLabel: "Matrícula",
    fieldType: "text",
    placeholder: "Ex: 2024001234",
    hint: {
      tone: "cool",
      text: "Primeiro acesso? Use sua matrícula e crie uma senha ao entrar pela primeira vez.",
    },
  },
  parent: {
    title: "Entrar como responsável",
    subtitle: "Acesse com o e-mail cadastrado na escola.",
    identifier: "email",
    fieldLabel: "E-mail",
    fieldType: "email",
    placeholder: "seu@email.com",
    hint: {
      tone: "warm",
      text: "Primeiro acesso? Verifique seu e-mail — a escola enviou um link de ativação.",
    },
  },
  teacher: {
    title: "Entrar como professor",
    subtitle: "Acesse com seu e-mail institucional.",
    identifier: "email",
    fieldLabel: "E-mail",
    fieldType: "email",
    placeholder: "professor@escola.edu.br",
  },
  director: {
    title: "Entrar como gestor",
    subtitle: "Acesse com seu e-mail de gestão.",
    identifier: "email",
    fieldLabel: "E-mail",
    fieldType: "email",
    placeholder: "gestor@escola.edu.br",
  },
};

export function LoginForm({ role }: { role: Role }) {
  const router = useRouter();
  const supabase = createClient();
  const c = CONFIG[role];

  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email =
      c.identifier === "matricula"
        ? matriculaToEmail(value)
        : value.trim().toLowerCase();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setLoading(false);
      setError(
        c.identifier === "matricula"
          ? "Matrícula ou senha incorreta."
          : "E-mail ou senha incorreta."
      );
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setLoading(false);
    router.push(ROLE_HOME[(profile?.role as Role) ?? role] ?? "/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-6">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-12">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[14px] font-medium text-muted hover:text-ink"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
        <span
          aria-hidden
          className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-ink font-display text-[17px] font-extrabold text-white"
        >
          Π
        </span>
      </div>

      {/* Header */}
      <div className="pt-10">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink">
          {c.title}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{c.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-9 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink">{c.fieldLabel}</span>
          <input
            type={c.fieldType}
            inputMode={c.identifier === "matricula" ? "numeric" : undefined}
            autoComplete={c.identifier === "matricula" ? "username" : "email"}
            placeholder={c.placeholder}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border-2 border-mist bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-faint transition-colors focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink">Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border-2 border-mist bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-faint transition-colors focus:border-ink"
          />
        </label>

        <div className="text-right">
          <button
            type="button"
            className="text-[13px] text-muted hover:text-ink"
            onClick={() =>
              setError(
                "Recuperação de senha: peça à secretaria da escola para reenviar o acesso."
              )
            }
          >
            Esqueci minha senha
          </button>
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        <Button type="submit" disabled={loading} className="mt-2 w-full py-4">
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      {c.hint && (
        <div
          className={`mt-6 rounded-[12px] border-[1.5px] p-4 text-[13px] leading-relaxed text-ink ${
            c.hint.tone === "warm"
              ? "border-gold bg-parchment"
              : "border-transparent bg-mist"
          }`}
        >
          {c.hint.text}
        </div>
      )}

      <div className="mt-auto py-8 text-center">
        <p className="text-xs text-faint">Paideia · Educação com IA · Conforme a LGPD</p>
      </div>
    </main>
  );
}
