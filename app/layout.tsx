import type { Metadata } from "next";
import { Manrope, Marcellus, Young_Serif } from "next/font/google";
import "./globals.css";

// Identidade Glaukópis (design/redesign-glaukopis/HANDOFF.md):
//  - Young Serif: títulos de tela (só tem o peso 400).
//  - Manrope: texto corrido e interface.
//  - Marcellus: só o logotipo PAIDEIA, o grego (παιδεία) e os glifos de matéria.
const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  weight: "400",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const marcellus = Marcellus({
  variable: "--font-marcellus",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paideia",
  description:
    "Tutoria socrática por IA que constrói entendimento, com visibilidade que respeita a privacidade para famílias e escolas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${youngSerif.variable} ${manrope.variable} ${marcellus.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
