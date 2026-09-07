import type { ReactNode } from "react";

/**
 * Renderiza o mínimo de markdown que os modelos realmente usam nas respostas:
 * **negrito** e *itálico*.
 *
 * Por que não uma lib de markdown: as três superfícies de chat (tutor,
 * conselheiro, insights) mostram texto curto e conversacional. Puxar um
 * parser completo traria HTML arbitrário vindo do modelo para dentro da
 * página — superfície de XSS por conveniência. Aqui o texto nunca vira HTML:
 * o texto continua sendo texto, e só a ênfase vira elemento.
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g;

export function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];

  text.split(TOKEN).forEach((part, i) => {
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      nodes.push(
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      nodes.push(<em key={i}>{part.slice(1, -1)}</em>);
    } else {
      nodes.push(part);
    }
  });

  return <>{nodes}</>;
}
