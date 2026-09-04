import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import type { Profile, Role } from "@/src/core/auth/types";

/**
 * Server-side route guard used by app/student/layout.tsx and
 * app/parent/layout.tsx. This is the practical UX boundary that keeps a
 * student out of parent pages and vice versa — Row-Level Security in
 * Postgres is the backstop if this check is ever bypassed, not a
 * replacement for it (see docs/ARCHITECTURE.md, Security & Privacy).
 *
 * Redirects to /login if unauthenticated, or to the other role's home if
 * the signed-in user has the wrong role for this section.
 */
export async function requireRole(role: Role): Promise<Profile> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, created_at")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  if (profile.role !== role) {
    redirect(profile.role === "student" ? "/student/tutor" : "/parent/dashboard");
  }

  return profile as Profile;
}
