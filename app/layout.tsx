import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Inter,
  Manrope,
  Marcellus,
} from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Grotesca contemporânea com personalidade — a identidade tipográfica do
// Paideia. Evita o clichê da serifa "IA premium".
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Tema grego do app do aluno (.theme-greek em globals.css): Marcellus nos
// títulos, com o ar de inscrição em pedra, e Manrope no texto corrido.
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
      className={`${inter.variable} ${bricolage.variable} ${manrope.variable} ${marcellus.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
