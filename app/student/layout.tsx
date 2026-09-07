import { requireRole } from "@/src/core/auth/require-role";
import { AppShell } from "@/src/ui/AppShell";
import { icons, type NavItem } from "@/src/ui/BottomNav";

const NAV: NavItem[] = [
  { href: "/student/tutor", label: "Tutor", icon: icons.chat },
  { href: "/student/revisao", label: "Revisão", icon: icons.cards },
  { href: "/student/loja", label: "Loja", icon: icons.store },
  { href: "/student/ajustes", label: "Ajustes", icon: icons.gear },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("student");
  return <AppShell nav={NAV}>{children}</AppShell>;
}
