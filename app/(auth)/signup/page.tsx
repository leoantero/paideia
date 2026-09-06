"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import type { Role } from "@/src/core/auth/types";
import { AuthShell } from "@/src/ui/AuthShell";
import { Button, ErrorText, Field, Input } from "@/src/ui/kit";

const ROLES: { value: Role; label: string; blurb: string }[] = [
  { value: "student", label: "I'm a student", blurb: "Get a tutor that helps you think it through." },
  { value: "parent", label: "I'm a parent", blurb: "Follow your child's progress by subject." },
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<Role>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName } },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push(role === "student" ? "/student/onboarding" : "/parent/link-student");
    router.refresh();
  }

  return (
    <AuthShell title="Create your account" subtitle="Takes less than a minute.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-body">I am a…</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  aria-pressed={active}
                  className={`rounded-[var(--radius)] border p-3 text-left transition-colors ${
                    active
                      ? "border-ink bg-mist-soft"
                      : "border-line bg-surface hover:border-ink"
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink">
                    {r.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{r.blurb}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Field label="Full name">
          <Input
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && <ErrorText>{error}</ErrorText>}

        <Button type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Sign up"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink hover:text-ink-strong">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
