import type { PerformanceRecord, StudentProfile } from "@/src/core/auth/types";
import { GRADE_BAND_LABELS_PT as GRADE_BAND_LABELS } from "@/src/core/auth/types";

const STRENGTH_STYLES: Record<PerformanceRecord["strength_level"], string> = {
  strong: "bg-strong-bg text-strong",
  average: "bg-average-bg text-average",
  weak: "bg-weak-bg text-weak",
};

const STRENGTH_LABELS: Record<PerformanceRecord["strength_level"], string> = {
  strong: "Strong",
  average: "Steady",
  weak: "Building",
};

const TREND_LABELS: Record<PerformanceRecord["trend"], string> = {
  improving: "↗ Improving",
  stable: "→ Holding steady",
  declining: "↘ Could use attention",
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
export function StudentPerformanceSection({
  student,
  records,
}: StudentPerformanceSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius)] border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(30,58,138,0.06)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
        <h2 className="text-lg font-semibold">
          {student.school_name ?? "Your child"}
        </h2>
        {student.grade_level && (
          <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-ink">
            {GRADE_BAND_LABELS[student.grade_level]}
          </span>
        )}
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-muted">
          No tutoring sessions recorded yet. Progress will appear here once your
          child starts working with their tutor.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex flex-col gap-2 rounded-[var(--radius)] border border-line bg-bg p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium capitalize text-body">
                  {record.subject}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STRENGTH_STYLES[record.strength_level]}`}
                >
                  {STRENGTH_LABELS[record.strength_level]}
                </span>
              </div>
              <span className="text-xs text-muted">
                {TREND_LABELS[record.trend]}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
