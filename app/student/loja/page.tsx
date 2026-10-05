import { redirect } from "next/navigation";

/** A loja agora é a aba "Tesouro" do Pódio; mantém links antigos vivos. */
export default function LojaPage() {
  redirect("/student/podio?tab=loja");
}
