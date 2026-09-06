import { requireRole } from "@/src/core/auth/require-role";
import { AppHeader } from "@/src/ui/AppHeader";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role guard — redirects to /login or /parent/dashboard if the
  // signed-in user isn't a student. See src/core/auth/require-role.ts.
  await requireRole("student");

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader context="Student" />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
