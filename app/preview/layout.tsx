import { StudentShell } from "@/src/ui/student/StudentShell";
import {
  PREVIEW_PROGRESS,
  assertPreviewEnabled,
} from "@/src/ui/student/preview/fixtures";

/** Dev-only: the student experience with fixture data (404 in production). */
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  assertPreviewEnabled();
  return (
    <StudentShell
      basePath="/preview"
      stats={{
        coins: PREVIEW_PROGRESS.coins,
        streak: PREVIEW_PROGRESS.streak,
        activeToday: PREVIEW_PROGRESS.active_today,
      }}
    >
      {children}
    </StudentShell>
  );
}
