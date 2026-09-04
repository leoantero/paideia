import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import {
  getLinkedStudents,
  getPerformanceForStudents,
} from "@/src/features/user-profiles/parent-profile-service";
import { StudentPerformanceSection } from "@/src/ui/parent/PerformanceCard";

export default async function ParentDashboardPage() {
  const supabase = await createClient();

  const students = await getLinkedStudents(supabase);
  const records = await getPerformanceForStudents(
    supabase,
    students.map((s) => s.id)
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your children</h1>
        <Link href="/parent/link-student" className="text-sm underline">
          + Link another child
        </Link>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-gray-500">
          No linked children yet.{" "}
          <Link href="/parent/link-student" className="underline">
            Enter your child's code
          </Link>{" "}
          to get started.
        </p>
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
