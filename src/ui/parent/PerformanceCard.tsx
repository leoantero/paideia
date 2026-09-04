import type { PerformanceRecord, StudentProfile } from "@/src/core/auth/types";

const STRENGTH_STYLES: Record<PerformanceRecord["strength_level"], string> = {
  strong: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  average: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  weak: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const TREND_LABELS: Record<PerformanceRecord["trend"], string> = {
  improving: "↗ Improving",
  stable: "→ Stable",
  declining: "↘ Needs attention",
};

interface StudentPerformanceSectionProps {
  student: StudentProfile;
  records: PerformanceRecord[];
}

/**
 * Deliberately shows only strength_level/trend per subject — never
 * conversation content or individual wrong answers (see docs/PEDAGOGY.md,
 * "What Parents DON'T See"). This isn't just a UI choice: the parent's
 * Supabase session cannot select from conversations/messages at all, so
 * there's nothing more granular this component could show even if it tried.
 */
export function StudentPerformanceSection({ student, records }: StudentPerformanceSectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-gray-200 p-5 dark:border-gray-800">
      <h2 className="text-lg font-semibold">
        {student.school_name ? `${student.school_name} — ` : ""}
        Student
      </h2>

      {records.length === 0 ? (
        <p className="text-sm text-gray-500">
          No tutoring sessions recorded yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 dark:border-gray-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{record.subject}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STRENGTH_STYLES[record.strength_level]}`}
                >
                  {record.strength_level}
                </span>
              </div>
              <span className="text-xs text-gray-500">{TREND_LABELS[record.trend]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
