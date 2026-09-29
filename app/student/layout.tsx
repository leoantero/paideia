import { requireRole } from "@/src/core/auth/require-role";
import { createClient } from "@/src/lib/supabase/server";
import { getMyProgress } from "@/src/features/gamification/gamification-service";
import { StudentShell } from "@/src/ui/student/StudentShell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role guard — redirects to /login or /parent/dashboard if the
  // signed-in user isn't a student. See src/core/auth/require-role.ts.
  await requireRole("student");

  const progress = await getMyProgress(await createClient());

  return (
    <StudentShell
      stats={{ coins: progress.coins, streak: progress.streak, activeToday: progress.active_today }}
    >
      {children}
    </StudentShell>
  );
}
