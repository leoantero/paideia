"use client";

import { useEffect, useState } from "react";
import { fenceArea } from "@/src/features/simulations/logic";
import type { MarkDone } from "./SimulationFrame";

const PERIMETER = 24;
const HALF = PERIMETER / 2;
const CELL = 19;
const WIDTHS = Array.from({ length: HALF - 1 }, (_, i) => i + 1);

/**
 * 24 m de cerca, sempre. Arraste a largura: a altura se ajusta para gastar
 * o mesmo barbante, e a área muda. As barras guardam cada área testada até
 * o pico aparecer.
 */
export function BarbanteCercado({ markDone }: { markDone: MarkDone }) {
  const [width, setWidth] = useState(3);
  const [tried, setTried] = useState<Set<number>>(() => new Set([3]));
  const height = HALF - width;
  const area = fenceArea(PERIMETER, width);

  useEffect(() => {
    if (area === 20) markDone("area-20");
    if (width === 1 || width === HALF - 1) markDone("mais-fino");
    if (width === HALF / 2) markDone("maior-area");
  }, [width, area, markDone]);

  function choose(w: number) {
    setWidth(w);
    setTried((t) => new Set(t).add(w));
  }

  const maxArea = fenceArea(PERIMETER, HALF / 2);
  const gridW = (HALF - 1) * CELL;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between" aria-live="polite">
        <p className="font-display text-[22px] leading-tight">
          {width} m × {height} m
        </p>
        <p className="text-right">
          <span className="font-display text-[30px] leading-none">
            {area} m²
          </span>
          <span className="block text-[12px] font-bold text-muted">
            de horta · cerca {PERIMETER} m
          </span>
        </p>
      </div>

      <svg
        viewBox={`0 0 ${gridW + 8} ${gridW + 8}`}
        className="w-full max-w-[300px] self-center"
        role="img"
        aria-label={`Cercado de ${width} por ${height} metros, área ${area} metros quadrados`}
      >
        {Array.from({ length: HALF }, (_, i) => (
          <g key={i} stroke="var(--p-line)" strokeWidth={1}>
            <line x1={4 + i * CELL} y1={4} x2={4 + i * CELL} y2={gridW + 4} />
            <line x1={4} y1={4 + i * CELL} x2={gridW + 4} y2={4 + i * CELL} />
          </g>
        ))}
        <rect
          x={4}
          y={4 + (HALF - 1 - height) * CELL}
          width={width * CELL}
          height={height * CELL}
          fill="#b5ddd6"
          stroke="#1f4f4c"
          strokeWidth={3}
          strokeDasharray="6 4"
          rx={2}
          className="motion-safe:transition-all motion-safe:duration-300"
        />
      </svg>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-muted">
          Largura do cercado
        </span>
        <input
          type="range"
          min={1}
          max={HALF - 1}
          value={width}
          onChange={(e) => choose(Number(e.target.value))}
          className="h-11 w-full accent-[var(--p-night)]"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-muted">
          Áreas que você já testou
        </span>
        <div
          className="flex h-24 items-end gap-1"
          role="img"
          aria-label="Gráfico das áreas testadas"
        >
          {WIDTHS.map((w) => {
            const a = fenceArea(PERIMETER, w);
            const seen = tried.has(w);
            return (
              <div key={w} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className={`w-full rounded-t-[3px] motion-safe:transition-[height] ${
                    w === width
                      ? "bg-night"
                      : seen
                        ? "bg-glauco-mid"
                        : "bg-line"
                  }`}
                  style={{ height: seen ? `${(a / maxArea) * 72}px` : "4px" }}
                />
                <span className="text-[10px] tabular-nums text-muted">{w}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
