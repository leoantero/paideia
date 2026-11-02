"use client";

import { useEffect, useRef, useState } from "react";
import {
  balanceFor,
  isSolved,
  removeFromBoth,
  removeFromLeftOnly,
  splitIntoGroups,
  type BalanceState,
} from "@/src/features/simulations/logic";
import { SimButton, type MarkDone } from "./SimulationFrame";

const PUZZLES: Array<[number, number, number]> = [
  [1, 3, 7],
  [2, 1, 9],
  [3, 2, 11],
];

function equation(s: BalanceState) {
  const x = s.xs === 1 ? "x" : `${s.xs}x`;
  const left = s.left > 0 ? `${x} + ${s.left}` : x;
  return `${left} ${s.tilt === 0 ? "=" : "≠"} ${s.right}`;
}

function Pan({ xs, units, cx }: { xs: number; units: number; cx: number }) {
  const items = [
    ...Array.from({ length: xs }, () => "x" as const),
    ...Array.from({ length: units }, () => "1" as const),
  ];
  const perRow = 5;
  return (
    <g>
      <path d={`M ${cx - 52} 0 Q ${cx} 22 ${cx + 52} 0 Z`} fill="#b8c5ee" />
      {items.map((it, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const x = cx - 44 + col * 18;
        const y = -16 - row * 18;
        return it === "x" ? (
          <g key={i}>
            <rect x={x} y={y} width={16} height={16} rx={3} fill="#1c2a4a" />
            <text
              x={x + 8}
              y={y + 12}
              textAnchor="middle"
              fontSize={11}
              fontWeight={800}
              fill="#fff"
            >
              x
            </text>
          </g>
        ) : (
          <g key={i}>
            <circle cx={x + 8} cy={y + 8} r={7.5} fill="#e2a23a" />
            <text
              x={x + 8}
              y={y + 12}
              textAnchor="middle"
              fontSize={10}
              fontWeight={800}
              fill="#3b2a06"
            >
              1
            </text>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Balança de dois pratos: a caixa x tem peso desconhecido. Tirar o mesmo dos
 * dois lados mantém o equilíbrio — é a ideia da equação, sem fórmula.
 */
export function BalancaEquacao({ markDone }: { markDone: MarkDone }) {
  const [puzzle, setPuzzle] = useState(0);
  const [state, setState] = useState<BalanceState>(() =>
    balanceFor(...PUZZLES[0])
  );
  const [before, setBefore] = useState<BalanceState | null>(null);
  const solved = useRef(new Set<number>());

  const done = isSolved(state);

  useEffect(() => {
    if (state.tilt !== 0) markDone("desequilibrar");
    if (!done || solved.current.has(puzzle)) return;
    solved.current.add(puzzle);
    if (puzzle === 0) markDone("resolver-1");
    if (solved.current.size === PUZZLES.length) markDone("resolver-3");
  }, [state, done, puzzle, markDone]);

  function act(fn: (s: BalanceState) => BalanceState) {
    const next = fn(state);
    if (next.tilt !== 0 && state.tilt === 0) setBefore(state);
    setState(next);
  }

  function load(i: number) {
    setPuzzle(i);
    setState(balanceFor(...PUZZLES[i]));
    setBefore(null);
  }

  // tilt 1 = direita mais pesada: o braço gira no sentido horário.
  const angle = state.tilt * 9;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-[26px]" aria-live="polite">
          {equation(state)}
        </p>
        <span className="text-[12px] font-bold text-muted">
          Balança {puzzle + 1} de {PUZZLES.length}
        </span>
      </div>

      <svg
        viewBox="0 52 300 138"
        className="w-full"
        role="img"
        aria-label={`Balança: ${equation(state)}${state.tilt ? ", desequilibrada" : ", em equilíbrio"}`}
      >
        <polygon points="150,90 132,180 168,180" fill="#2a6663" />
        <rect x={110} y={176} width={80} height={8} rx={4} fill="#1f4f4c" />
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "150px 90px",
          }}
          className="motion-safe:transition-transform motion-safe:duration-500"
        >
          <rect x={40} y={86} width={220} height={8} rx={4} fill="#1c2a4a" />
          <line
            x1={64}
            y1={90}
            x2={64}
            y2={128}
            stroke="#505873"
            strokeWidth={1.5}
          />
          <line
            x1={236}
            y1={90}
            x2={236}
            y2={128}
            stroke="#505873"
            strokeWidth={1.5}
          />
          <g transform="translate(0 128)">
            <Pan xs={state.xs} units={state.left} cx={64} />
            <Pan xs={0} units={state.right} cx={236} />
          </g>
        </g>
      </svg>

      <div
        className="rounded-[12px] bg-bg px-4 py-3 text-[14.5px] leading-snug"
        aria-live="polite"
      >
        {state.tilt !== 0 ? (
          <p className="font-bold text-coral-ink">
            Tirou de um lado só e a balança pendeu! O que estava igual deixou de
            ser igual.
          </p>
        ) : done ? (
          <p className="font-bold text-glauco-ink">
            Equilíbrio com uma caixa só: x = {state.right}. Sem abrir a caixa!
          </p>
        ) : state.left === 0 && state.xs > 1 ? (
          <p>
            Só sobraram caixas x de um lado. Dá para repartir o outro lado em{" "}
            {state.xs} grupos iguais?
          </p>
        ) : (
          <p className="text-muted">Tire pesos sem deixar a balança pender.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {state.tilt !== 0 ? (
          <SimButton variant="solid" onClick={() => before && setState(before)}>
            Devolver o peso
          </SimButton>
        ) : done ? (
          puzzle < PUZZLES.length - 1 && (
            <SimButton variant="solid" onClick={() => load(puzzle + 1)}>
              Próxima balança
            </SimButton>
          )
        ) : (
          <>
            <SimButton
              onClick={() => act(removeFromBoth)}
              disabled={state.left === 0 || state.right === 0}
            >
              Tirar 1 dos dois pratos
            </SimButton>
            <SimButton
              onClick={() => act(removeFromLeftOnly)}
              disabled={state.left === 0}
            >
              Tirar 1 só da esquerda
            </SimButton>
            <SimButton
              onClick={() => act(splitIntoGroups)}
              disabled={state.left !== 0 || state.xs <= 1}
            >
              Repartir em grupos
            </SimButton>
          </>
        )}
        {done && (
          <SimButton onClick={() => load(puzzle)}>Recomeçar esta</SimButton>
        )}
      </div>
    </div>
  );
}
