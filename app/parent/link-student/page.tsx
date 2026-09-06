"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { linkStudentByCode } from "@/src/features/user-profiles/linking-service";
import { Button, Callout, Card, ErrorText } from "@/src/ui/kit";

export default function LinkStudentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await linkStudentByCode(supabase, code);
      router.push("/parent/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link that code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold">Link your child&apos;s account</h1>
        <p className="text-sm text-muted">
          Ask your child for the 6-character code shown in their onboarding.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            placeholder="ABC123"
            aria-label="Linking code"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="rounded-[var(--radius)] border border-line bg-surface px-3 py-3 text-center font-mono text-2xl font-semibold tracking-[0.4em] text-ink placeholder:text-line focus:border-ink"
          />

          {error && <ErrorText>{error}</ErrorText>}

          <Button type="submit" disabled={loading || code.length < 6}>
            {loading ? "Linking…" : "Link account"}
          </Button>
        </form>

        <Callout>
          You&apos;ll see your child&apos;s subject strengths and progress trends —
          never their tutoring conversations.
        </Callout>
      </Card>
    </main>
  );
}
