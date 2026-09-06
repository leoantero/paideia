import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { Wordmark } from "@/src/ui/Wordmark";
import { LinkButton } from "@/src/ui/kit";

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

    if (profile?.role === "student") redirect("/student/tutor");
    if (profile?.role === "parent") redirect("/parent/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
        <Wordmark />
        <LinkButton href="/login" variant="secondary">
          Log in
        </LinkButton>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-ink">
            Socratic AI tutoring
          </span>
          <h1 className="max-w-2xl text-4xl leading-tight font-semibold sm:text-5xl">
            Learning that asks the next question
          </h1>
          <p className="max-w-xl text-base text-muted">
            Paideia guides students to their own answers instead of handing them
            over — and gives parents clear, privacy-respecting visibility into how
            their child is progressing.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/signup" variant="primary">
            Get started
          </LinkButton>
          <LinkButton href="/login" variant="secondary">
            I already have an account
          </LinkButton>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Guides, never answers",
              body: "Every reply is a question that moves the student one step forward.",
            },
            {
              title: "Built for their level",
              body: "Tone and pacing adapt to elementary through high school.",
            },
            {
              title: "Parents see progress, not chats",
              body: "Subject strengths and trends — never the conversation itself.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-[var(--radius)] border border-line bg-surface p-4 text-left"
            >
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
