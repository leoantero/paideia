import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "student") redirect("/student");
    if (profile?.role === "parent") redirect("/parent/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold">Yellow AI</h1>
      <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
        A Socratic tutoring companion for students, with clear, privacy-respecting
        visibility for parents.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
