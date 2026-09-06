import { requireRole } from "@/src/core/auth/require-role";
import { AppHeader } from "@/src/ui/AppHeader";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("parent");

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader context="Parent" />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
