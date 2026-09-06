/**
 * O "print" de contraste da tela de entrada: o mesmo problema, uma IA
 * genérica entregando a resposta e o Paideia conduzindo por perguntas até o
 * aluno chegar sozinho. Estático de propósito — é uma foto, não uma animação.
 */

const PROBLEM =
  "Uma padaria assou 120 pães. De manhã vendeu 3/5 dos pães; à tarde vendeu 3/4 do que sobrou. Quantos pães restaram no fim do dia?";

const GENERIC = "Restaram 12 pães.";

const PAIDEIA_THREAD: { who: "tutor" | "aluno"; text: string }[] = [
  { who: "tutor", text: "Vamos por partes. Se de manhã ela vendeu 3/5 dos 120 pães, quantos pães foram vendidos de manhã?" },
  { who: "aluno", text: "72" },
  { who: "tutor", text: "Isso. E quantos pães sobraram para a tarde?" },
  { who: "aluno", text: "48. Aí de tarde vendeu 3/4 de 48…" },
  { who: "tutor", text: "Exato. Quanto é 3/4 de 48 — e o que isso te diz sobre o que restou?" },
];

function Bubble({
  align,
  tone,
  children,
}: {
  align: "start" | "end";
  tone: "aluno" | "tutor" | "generic";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "aluno"
      ? "bg-ink text-white rounded-br-sm"
      : tone === "generic"
        ? "bg-weak-bg text-weak rounded-bl-sm"
        : "bg-mist-soft text-body rounded-bl-sm";
  return (
    <div className={`flex ${align === "end" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${toneClass}`}>
        {children}
      </div>
    </div>
  );
}

export function ContrastDemo() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Mesmo problema de matemática (8º ano)
      </p>
      <div className="rounded-[var(--radius)] border border-line bg-surface p-3 text-[13px] text-body">
        {PROBLEM}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-line bg-bg p-3">
          <span className="text-xs font-semibold text-weak">Uma IA genérica</span>
          <Bubble align="start" tone="generic">{GENERIC}</Bubble>
          <span className="mt-1 text-[11px] text-muted">
            Entrega o número. O aluno copia e não aprende nada.
          </span>
        </div>

        <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-ink/20 bg-mist-soft/40 p-3">
          <span className="text-xs font-semibold text-ink">Paideia</span>
          {PAIDEIA_THREAD.map((m, i) => (
            <Bubble
              key={i}
              align={m.who === "aluno" ? "end" : "start"}
              tone={m.who === "aluno" ? "aluno" : "tutor"}
            >
              {m.text}
            </Bubble>
          ))}
          <span className="mt-1 text-[11px] text-muted">
            Conduz por perguntas. O aluno chega sozinho — e fixa o método.
          </span>
        </div>
      </div>
    </div>
  );
}
