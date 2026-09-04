"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import type { GradeBand } from "@/src/core/auth/types";
import { GRADE_BAND_LABELS } from "@/src/core/auth/types";

const GRADE_BANDS: GradeBand[] = ["elementary_1", "elementary_2", "high_school"];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [gradeLevel, setGradeLevel] = useState<GradeBand>("elementary_1");
  const [schoolName, setSchoolName] = useState("");
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCode() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("students")
        .select("linking_code, grade_level")
        .eq("id", user.id)
        .single();

      if (data) {
        setLinkingCode(data.linking_code);
        if (data.grade_level) setSaved(true);
      }
    }
    loadCode();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("students")
        .update({ grade_level: gradeLevel, school_name: schoolName || null })
        .eq("id", user.id);
    }

    setLoading(false);
    setSaved(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Welcome! Let's set you up.</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Grade level
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value as GradeBand)}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
          >
            {GRADE_BANDS.map((band) => (
              <option key={band} value={band}>
                {GRADE_BAND_LABELS[band]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          School name (optional)
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </form>

      {linkingCode && (
        <div className="rounded-md border border-gray-300 p-4 text-sm dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Share this code with a parent so they can follow your progress:
          </p>
          <p className="mt-2 text-2xl font-mono font-semibold tracking-widest">
            {linkingCode}
          </p>
        </div>
      )}

      {saved && (
        <button
          onClick={() => router.push("/student/tutor")}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
        >
          Continue to tutor →
        </button>
      )}
    </main>
  );
}
