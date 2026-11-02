"use client";

import { useEffect, useRef, useState } from "react";
import { equivalentFraction } from "@/src/features/simulations/logic";
import { SimButton, type MarkDone } from "./SimulationFrame";

const CUTS = [2, 3, 4, 6, 8];
const R = 92;
const C = 100;

function slicePath(i: number, n: number): string {
  if (n === 1)
    return `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z`;
  const a0 = -Math.PI / 2 + (2 * Math.PI * i) / n;
  const a1 = -Math.PI / 2 + (2 * Math.PI * (i + 1)) / n;
  const p = (a: number) => `${C + R * Math.cos(a)} ${C + R * Math.sin(a)}`;
  return `M ${C} ${C} L ${p(a0)} A ${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`;
}

/** Frações com pizza (prancha `TelaSimulacaoFracoes`): toque nas fatias para pegá-las. */
export function FracoesPizza({ markDone }: { markDone: MarkDone }) {
  const [n, setN] = useState(8);
  const [k, setK] = useState(3);
  const halves = useRef(new Set<number>());
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (2 * k === n) {
      halves.current.add(n);
      if (halves.current.size >= 3) markDone("meia-3-jeitos");
    }
    seen.current.add(`${k}/${n}`);
    if (seen.current.has("2/3") && seen.current.has("3/4"))
      markDone("dois-tercos-tres-quartos");
    if (n === 8 && k === 8) markDone("inteira");
  }, [k, n, markDone]);

  const equiv = equivalentFraction(k, n);

  function tapSlice(i: number) {
    setK(i < k ? i : i + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-5">
        <svg
          viewBox="0 0 200 200"
          className="w-[min(200px,52vw)] shrink-0"
          role="group"
          aria-label={`Pizza cortada em ${n} fatias, ${k} selecionadas`}
        >
          <circle cx={C} cy={C} r={R + 6} fill="#e2a23a" />
          {Array.from({ length: n }, (_, i) => (
            <path
              key={`${n}-${i}`}
              d={slicePath(i, n)}
              fill={i < k ? "#e48e78" : "#fbe8bd"}
              stroke="#fff4d9"
              strokeWidth={3}
              className="cursor-pointer motion-safe:transition-[fill] motion-safe:duration-200"
              role="button"
              tabIndex={0}
              aria-label={`Fatia ${i + 1}${i < k ? ", pega" : ""}`}
              onClick={() => tapSlice(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  tapSlice(i);
                }
              }}
            />
          ))}
        </svg>
        <div
          className="flex flex-col items-center font-display leading-none"
          aria-live="polite"
        >
          <span className="text-[46px]">{k}</span>
          <span className="my-1 h-[3px] w-14 rounded-full bg-ink" />
          <span className="text-[46px]">{n}</span>
        </div>
      </div>

      <div
        className="rounded-[12px] bg-bg px-4 py-3 text-[14.5px] leading-snug"
        aria-live="polite"
      >
        <p className="font-bold">
          Você pegou {k} de {n} fatias.
        </p>
        {equiv ? (
          <p className="text-glauco-ink">
            É a mesma quantidade de pizza que <strong>{equiv}</strong>.
          </p>
        ) : (
          <p className="text-muted">
            {k === 0
              ? "Toque nas fatias para pegar."
              : n < 8
                ? "Já está na forma mais simples. Dá para pegar a mesma quantidade cortando em mais fatias?"
                : "Tente 4 de 8: quanto da pizza isso é?"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold text-muted">Cortar em</span>
        <div className="flex gap-2">
          {CUTS.map((c) => (
            <SimButton
              key={c}
              pressed={n === c}
              onClick={() => {
                setN(c);
                setK((v) => Math.min(v, c));
              }}
              label={`Cortar em ${c} fatias`}
            >
              {c}
            </SimButton>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[13px] font-bold text-muted">
          Fatias que você pega
        </span>
        <SimButton
          onClick={() => setK((v) => Math.max(0, v - 1))}
          disabled={k === 0}
          label="Devolver uma fatia"
        >
          −
        </SimButton>
        <span className="w-6 text-center text-lg font-extrabold tabular-nums">
          {k}
        </span>
        <SimButton
          onClick={() => setK((v) => Math.min(n, v + 1))}
          disabled={k === n}
          label="Pegar mais uma fatia"
        >
          +
        </SimButton>
      </div>
    </div>
  );
}
