import { createClient } from "@/src/lib/supabase/server";
import {
  getLinkedStudents,
  getPerformanceForStudents,
} from "@/src/features/user-profiles/parent-profile-service";
import { StudentPerformanceSection } from "@/src/ui/parent/PerformanceCard";
import { Callout, LinkButton } from "@/src/ui/kit";

export default async function ParentDashboardPage() {
  const supabase = await createClient();

  const students = await getLinkedStudents(supabase);
  const records = await getPerformanceForStudents(
    supabase,
    students.map((s) => s.id)
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Your children</h1>
          <p className="text-sm text-muted">
            Subject strengths and progress trends — updated after each tutoring
            session.
          </p>
        </div>
        {students.length > 0 && (
          <LinkButton href="/parent/link-student" variant="secondary">
            + Link another child
          </LinkButton>
        )}
      </div>

      {students.length === 0 ? (
        <Callout className="flex flex-col gap-3">
          <p>
            No children linked yet. Ask your child for the 6-character code from
            their onboarding screen to get started.
          </p>
          <LinkButton href="/parent/link-student" variant="gold">
            Enter your child&apos;s code
          </LinkButton>
        </Callout>
      ) : (
        <div className="flex flex-col gap-4">
          {students.map((student) => (
            <StudentPerformanceSection
              key={student.id}
              student={student}
              records={records.filter((r) => r.student_id === student.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
