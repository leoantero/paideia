import { requireRole } from "@/src/core/auth/require-role";
import { AppShell } from "@/src/ui/AppShell";
import { icons, type NavItem } from "@/src/ui/BottomNav";

const NAV: NavItem[] = [
  { href: "/parent/dashboard", label: "Painel", icon: icons.chart },
  { href: "/parent/chat", label: "Conselheiro", icon: icons.chat },
  { href: "/parent/ajustes", label: "Ajustes", icon: icons.settings },
];

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("parent");
  return <AppShell nav={NAV}>{children}</AppShell>;
}
