"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { ROLE_HOME, matriculaToEmail, type Role } from "@/src/core/auth/types";
import { Button, ErrorText } from "@/src/ui/kit";
import { Marca } from "@/src/ui/paideia/Marca";
import { ChevronLeftIcon } from "@/src/ui/paideia/line-icons";

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
      text: "Primeiro acesso? Verifique seu e-mail: a escola enviou um link de ativação.",
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

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email,
        password,
      }
    );

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

  const field =
    "h-[50px] w-full rounded-sm border-[1.5px] border-input bg-surface px-3.5 text-base text-ink placeholder:text-faint focus:border-night focus:outline-none";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col gap-[26px] px-6 pt-[18px]">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="-ml-1.5 flex min-h-11 items-center gap-1 text-sm font-bold text-muted hover:text-ink"
        >
          <ChevronLeftIcon size={20} />
          Voltar
        </Link>
        <span className="flex items-center gap-2">
          <Marca
            variante="busto"
            peso="compacta"
            size={30}
            linha="var(--p-night)"
            louro="var(--p-coin)"
            title={null}
          />
          <span className="font-mark text-lg tracking-[0.16em]">PAIDEIA</span>
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-1.5">
        <h1 className="text-[30px] leading-tight">{c.title}</h1>
        <p className="text-[15px] text-muted">{c.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-id" className="text-sm font-bold">
            {c.fieldLabel}
          </label>
          <input
            id="login-id"
            type={c.fieldType}
            inputMode={c.identifier === "matricula" ? "numeric" : undefined}
            autoComplete={c.identifier === "matricula" ? "username" : "email"}
            placeholder={c.placeholder}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`${field} ${
              c.identifier === "matricula"
                ? "font-bold tracking-[0.06em] tabular-nums"
                : ""
            }`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="login-senha" className="text-sm font-bold">
              Senha
            </label>
            <button
              type="button"
              className="text-[13px] font-bold text-glauco-deep"
              onClick={() =>
                setError(
                  "Recuperação de senha: peça à secretaria da escola para reenviar o acesso."
                )
              }
            >
              Esqueci minha senha
            </button>
          </div>
          <input
            id="login-senha"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-[52px] w-full text-base"
        >
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      {c.hint && (
        <p
          className={`rounded-[12px] px-4 py-3.5 text-sm leading-normal ${
            c.hint.tone === "warm"
              ? "bg-lamp-soft text-ink"
              : "bg-lavender text-on-lavender"
          }`}
        >
          {c.hint.text}
        </p>
      )}

      <p className="mt-auto py-6 text-center text-xs text-muted">
        Paideia · Educação com IA · Conforme a LGPD
      </p>
    </main>
  );
}
