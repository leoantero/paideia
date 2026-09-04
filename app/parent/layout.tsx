import { requireRole } from "@/src/core/auth/require-role";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("parent");

  return <div className="flex flex-1 flex-col">{children}</div>;
}
