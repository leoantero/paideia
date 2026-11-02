"use client";

import { useEffect, useState } from "react";
import { moveExpression, type Move } from "@/src/features/simulations/logic";
import { SimButton, type MarkDone } from "./SimulationFrame";

type Mode = "elevador" | "termometro";

const RANGES: Record<Mode, { min: number; max: number; start: number }> = {
  elevador: { min: -5, max: 6, start: 0 },
  termometro: { min: -8, max: 8, start: 2 },
};

const signed = (v: number) => (v < 0 ? `−${Math.abs(v)}` : String(v));

function floorLabel(v: number) {
  if (v === 0) return "Térreo";
  if (v < 0) return `${signed(v)} · ${Math.abs(v)}º subsolo`;
  return `${v}º andar`;
}

/**
 * Reta numérica de pé: o prédio com subsolos e o termômetro são a mesma
 * reta. Toque num andar (ou numa temperatura) para ir até lá; a conta do
 * movimento aparece embaixo.
 */
export function TermometroElevador({ markDone }: { markDone: MarkDone }) {
  const [mode, setMode] = useState<Mode>("elevador");
  const [value, setValue] = useState(RANGES.elevador.start);
  const [last, setLast] = useState<Move | null>(null);

  const { min, max } = RANGES[mode];
  const values = Array.from({ length: max - min + 1 }, (_, i) => max - i);

  useEffect(() => {
    if (mode === "elevador") {
      if (last && last.from === -3 && last.to === 2) markDone("subsolo-sobe-5");
      if (value < -1 && value > -4) markDone("menor-que-menos-1");
    } else if (last && last.from === -2 && last.to === -6) {
      markDone("esfriou-4");
    }
  }, [mode, value, last, markDone]);

  function go(to: number) {
    if (to === value) return;
    setLast({ from: value, to });
    setValue(to);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setValue(RANGES[m].start);
    setLast(null);
  }

  const rowH = 30;
  const pos = (v: number) => (max - v) * rowH;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <SimButton
          pressed={mode === "elevador"}
          onClick={() => switchMode("elevador")}
        >
          Elevador
        </SimButton>
        <SimButton
          pressed={mode === "termometro"}
          onClick={() => switchMode("termometro")}
        >
          Termômetro
        </SimButton>
      </div>

      <div className="flex gap-4">
        <div
          className="relative w-[96px] shrink-0"
          style={{ height: values.length * rowH }}
        >
          {mode === "elevador" ? (
            <>
              <div
                className="absolute inset-x-2 rounded-t-[6px] bg-lavender-soft"
                style={{ top: 0, height: pos(0) + rowH }}
              />
              <div
                className="absolute inset-x-2 bg-[#d8d4c8] dark:bg-[#2a3150]"
                style={{ top: pos(0) + rowH, bottom: 0 }}
              />
              <div
                className="absolute inset-x-0 h-[2px] bg-glauco-ink"
                style={{ top: pos(0) + rowH }}
                aria-hidden
              />
              <div
                className="absolute left-1/2 grid h-[26px] w-[34px] -translate-x-1/2 place-items-center rounded-[5px] bg-night text-[11px] font-extrabold text-on-night motion-safe:transition-[top] motion-safe:duration-500"
                style={{ top: pos(value) + 2 }}
                aria-hidden
              >
                {signed(value)}
              </div>
            </>
          ) : (
            <>
              <div
                className="absolute left-1/2 top-0 w-[18px] -translate-x-1/2 rounded-full bg-line"
                style={{ bottom: 0 }}
              />
              <div
                className={`absolute left-1/2 w-[18px] -translate-x-1/2 rounded-b-full motion-safe:transition-[top] motion-safe:duration-500 ${
                  value < 0 ? "bg-lavender-deep" : "bg-coral-mid"
                }`}
                style={{ top: pos(value) + rowH / 2, bottom: 0 }}
                aria-hidden
              />
              <div
                className="absolute inset-x-3 h-[2px] bg-ink"
                style={{ top: pos(0) + rowH / 2 }}
                aria-hidden
              />
            </>
          )}
        </div>

        <ol
          className="flex flex-1 flex-col"
          aria-label={mode === "elevador" ? "Andares" : "Temperaturas"}
        >
          {values.map((v) => (
            <li key={v} style={{ height: rowH }}>
              <button
                type="button"
                onClick={() => go(v)}
                aria-current={v === value ? "true" : undefined}
                className={`flex h-full w-full items-center rounded-[6px] px-2 text-left text-[13px] tabular-nums ${
                  v === value
                    ? "bg-night font-extrabold text-on-night"
                    : v === 0
                      ? "font-bold"
                      : "text-muted"
                }`}
              >
                {mode === "elevador" ? floorLabel(v) : `${signed(v)} °C`}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div
        className="rounded-[12px] bg-bg px-4 py-3 text-[14.5px] leading-snug"
        aria-live="polite"
      >
        {last ? (
          <>
            <p className="font-display text-[22px]">{moveExpression(last)}</p>
            <p className="text-muted">
              {mode === "elevador"
                ? last.to > last.from
                  ? `Subiu ${last.to - last.from} andares.`
                  : `Desceu ${last.from - last.to} andares.`
                : last.to > last.from
                  ? `Esquentou ${last.to - last.from} graus.`
                  : `Esfriou ${last.from - last.to} graus.`}
            </p>
          </>
        ) : (
          <p className="text-muted">
            {mode === "elevador"
              ? "Toque num andar para o elevador ir até lá."
              : "Toque numa temperatura."}
          </p>
        )}
      </div>
    </div>
  );
}
