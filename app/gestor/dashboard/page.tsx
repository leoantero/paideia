import { createClient } from "@/src/lib/supabase/server";
import {
  getDailySessions,
  getGestorScope,
  getGuardianCoverage,
  getSchoolOverview,
  getSubjectMastery,
  getTeacherEngagement,
} from "@/src/features/user-profiles/gestor-service";
import { DashboardView } from "@/src/ui/gestor/DashboardView";

export const dynamic = "force-dynamic";

export default async function GestorDashboardPage() {
  const supabase = await createClient();

  const [scope, overview, daily, teachers, subjects, guardians] =
    await Promise.all([
      getGestorScope(supabase),
      getSchoolOverview(supabase),
      getDailySessions(supabase),
      getTeacherEngagement(supabase),
      getSubjectMastery(supabase),
      getGuardianCoverage(supabase),
    ]);

  const scopeLabel =
    scope.schoolName ?? scope.organizationName ?? "Visão da unidade";

  return (
    <DashboardView
      scopeLabel={scopeLabel}
      overview={overview}
      daily={daily}
      teachers={teachers}
      subjects={subjects}
      guardians={guardians}
    />
  );
}
