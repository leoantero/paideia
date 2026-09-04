"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import type { Role } from "@/src/core/auth/types";

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
      options: {
        data: { role, full_name: fullName },
      },
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
    <main className="flex flex-1 items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-xl font-semibold">Create your account</h1>

        <div className="flex gap-2 rounded-md border border-gray-300 p-1 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 rounded px-3 py-1.5 text-sm ${
              role === "student" ? "bg-black text-white dark:bg-white dark:text-black" : ""
            }`}
          >
            I'm a student
          </button>
          <button
            type="button"
            onClick={() => setRole("parent")}
            className={`flex-1 rounded px-3 py-1.5 text-sm ${
              role === "parent" ? "bg-black text-white dark:bg-white dark:text-black" : ""
            }`}
          >
            I'm a parent
          </button>
        </div>

        <input
          type="text"
          placeholder="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
        />
        <input
          type="password"
          placeholder="Password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
