"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Wordmark } from "@/src/ui/Wordmark";

/**
 * Persistent top bar for signed-in sections. Provides the one thing the app
 * previously had nowhere: a way to sign out. `context` labels the current
 * area so students/parents always know where they are.
 */
export function AppHeader({ context }: { context?: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <Wordmark href="/" />
          {context && (
            <>
              <span aria-hidden className="text-line">
                /
              </span>
              <span className="text-sm text-muted">{context}</span>
            </>
          )}
        </div>
        <button
          onClick={signOut}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
