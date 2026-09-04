"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { linkStudentByCode } from "@/src/features/user-profiles/linking-service";

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
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Link your child's account</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Ask your child for the code shown after they finish their onboarding.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="6-character code"
          required
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="rounded-md border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-widest dark:border-gray-700 dark:bg-transparent"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Linking…" : "Link account"}
        </button>
      </form>
    </main>
  );
}
