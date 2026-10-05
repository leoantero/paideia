import { requireRole } from "@/src/core/auth/require-role";
import { getVerifiedUser } from "@/src/lib/supabase/verified-user";
import { getMyProgress } from "@/src/features/gamification/gamification-service";
import { StudentShell } from "@/src/ui/student/StudentShell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("student");
  const { supabase } = await getVerifiedUser();
  const progress = await getMyProgress(supabase);

  return (
    <StudentShell
      stats={{
        coins: progress.coins,
        streak: progress.streak,
        activeToday: progress.active_today,
      }}
    >
      {children}
    </StudentShell>
  );
}
