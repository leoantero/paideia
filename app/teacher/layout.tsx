import { requireRole } from "@/src/core/auth/require-role";
import { AppShell } from "@/src/ui/AppShell";
import { icons, type NavItem } from "@/src/ui/BottomNav";

const NAV: NavItem[] = [
  { href: "/teacher/turma", label: "Turma", icon: icons.heat },
  { href: "/teacher/construtor", label: "Construtor", icon: icons.build },
  { href: "/teacher/ajustes", label: "Ajustes", icon: icons.gear },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("teacher");
  return <AppShell nav={NAV}>{children}</AppShell>;
}
