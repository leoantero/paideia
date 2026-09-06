"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import type { GradeBand } from "@/src/core/auth/types";
import { DAILY_GOAL_MINUTES, GRADE_BAND_LABELS } from "@/src/core/auth/types";
import { Button, Callout, Card, Field, Input } from "@/src/ui/kit";

const GRADE_BANDS: GradeBand[] = ["elementary_1", "elementary_2", "high_school"];

const GRADE_HINTS: Record<GradeBand, string> = {
  elementary_1: "Roughly ages 6–10",
  elementary_2: "Roughly ages 11–14",
  high_school: "Roughly ages 15–18",
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [gradeLevel, setGradeLevel] = useState<GradeBand>("elementary_1");
  const [schoolName, setSchoolName] = useState("");
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
        if (data.grade_level) {
          setGradeLevel(data.grade_level as GradeBand);
          setSaved(true);
        }
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

  async function copyCode() {
    if (!linkingCode) return;
    await navigator.clipboard.writeText(linkingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Step 1 of 2 · Set up your account
        </span>
        <h1 className="text-2xl font-semibold">Welcome to Paideia</h1>
        <p className="text-sm text-muted">
          Tell us your level so your tutor can pitch things just right.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-body">
            What level are you studying at?
          </legend>
          <div className="flex flex-col gap-2">
            {GRADE_BANDS.map((band) => {
              const active = gradeLevel === band;
              return (
                <button
                  key={band}
                  type="button"
                  onClick={() => setGradeLevel(band)}
                  aria-pressed={active}
                  className={`flex items-center justify-between rounded-[var(--radius)] border p-4 text-left transition-colors ${
                    active
                      ? "border-ink bg-mist-soft"
                      : "border-line bg-surface hover:border-ink"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      {GRADE_BAND_LABELS[band]}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {GRADE_HINTS[band]} · {DAILY_GOAL_MINUTES[band]} min daily goal
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${
                      active
                        ? "border-ink bg-ink text-white"
                        : "border-line text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Field label="School name" hint="Optional — helps teachers find you later.">
          <Input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
          />
        </Field>

        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : saved ? "Update" : "Save and continue"}
        </Button>
      </form>

      {saved && linkingCode && (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Step 2 of 2 · Optional
            </span>
            <h2 className="text-lg font-semibold">Invite a parent</h2>
            <p className="text-sm text-muted">
              Share this code so a parent can follow your progress. They&apos;ll see
              your subject strengths — never your conversations. You can do this
              later too.
            </p>
          </div>

          <Callout className="flex items-center justify-between gap-3">
            <span className="font-mono text-2xl font-semibold tracking-[0.3em] text-ink">
              {linkingCode}
            </span>
            <Button type="button" variant="gold" onClick={copyCode}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </Callout>

          <Button
            type="button"
            variant="primary"
            onClick={() => router.push("/student/tutor")}
          >
            Continue to my tutor →
          </Button>
        </Card>
      )}
    </main>
  );
}
