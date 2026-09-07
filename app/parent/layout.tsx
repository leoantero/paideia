import { requireRole } from "@/src/core/auth/require-role";
import { AppShell } from "@/src/ui/AppShell";
import { icons, type NavItem } from "@/src/ui/BottomNav";

const NAV: NavItem[] = [
  { href: "/parent/dashboard", label: "Painel", icon: icons.dashboard },
  { href: "/parent/chat", label: "Conselheiro", icon: icons.advisor },
  { href: "/parent/ajustes", label: "Ajustes", icon: icons.gear },
];

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("parent");
  return <AppShell nav={NAV}>{children}</AppShell>;
}
