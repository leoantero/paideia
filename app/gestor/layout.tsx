import { requireRole } from "@/src/core/auth/require-role";
import { AppShell } from "@/src/ui/AppShell";
import { icons, type NavItem } from "@/src/ui/BottomNav";

const NAV: NavItem[] = [
  { href: "/gestor/insights", label: "Insights", icon: icons.insights },
  { href: "/gestor/dashboard", label: "Dashboard", icon: icons.bars },
  { href: "/gestor/ajustes", label: "Ajustes", icon: icons.gear },
];

export default async function GestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("director");
  return (
    <AppShell nav={NAV} label="Gestão">
      {children}
    </AppShell>
  );
}
