"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { ROLE_HOME, matriculaToEmail, type Role } from "@/src/core/auth/types";
import { AuthShell } from "@/src/ui/AuthShell";
import { Button, ErrorText, Field, Input } from "@/src/ui/kit";

interface LoginFormProps {
  role: Role;
  title: string;
  /** "matricula" logs in with a synthetic e-mail derived from the matrícula. */
  identifier: "matricula" | "email";
}

const LABELS: Record<LoginFormProps["identifier"], { label: string; type: string; placeholder: string; autoComplete: string }> = {
  matricula: { label: "Matrícula", type: "text", placeholder: "Ex: 20250801", autoComplete: "username" },
  email: { label: "E-mail", type: "email", placeholder: "voce@escola.com", autoComplete: "email" },
};

export function LoginForm({ role, title, identifier }: LoginFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const cfg = LABELS[identifier];

  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email =
      identifier === "matricula" ? matriculaToEmail(value) : value.trim().toLowerCase();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setLoading(false);
      setError(
        identifier === "matricula"
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

    if (profile?.role !== role) {
      // conta existe mas não é do perfil desta tela
      router.push(ROLE_HOME[profile?.role as Role] ?? "/");
    } else {
      router.push(ROLE_HOME[role]);
    }
    router.refresh();
  }

  return (
    <AuthShell title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={cfg.label}>
          <Input
            type={cfg.type}
            inputMode={identifier === "matricula" ? "numeric" : undefined}
            autoComplete={cfg.autoComplete}
            placeholder={cfg.placeholder}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label="Senha">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && <ErrorText>{error}</ErrorText>}

        <Button type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <Link href="/" className="text-center text-sm font-medium text-ink hover:text-ink-strong">
        ← Escolher outro perfil
      </Link>
    </AuthShell>
  );
}
