"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="h-12 w-full rounded-sm border-[1.5px] border-coral bg-surface text-[15px] font-extrabold text-coral-ink"
    >
      Sair
    </button>
  );
}
