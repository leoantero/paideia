"use client";

import { useEffect, useState } from "react";
import {
  friendlyAmount,
  percentOf,
  scaleAmount,
} from "@/src/features/simulations/logic";
import type { MarkDone } from "./SimulationFrame";

const BASE_PEOPLE = 4;

const INGREDIENTS = [
  { name: "farinha", unit: ["xícara", "xícaras"], base: 2, color: "bg-lamp" },
  { name: "ovos", unit: ["", ""], base: 3, color: "bg-coral-mid" },
  {
    name: "leite",
    unit: ["xícara", "xícaras"],
    base: 1,
    color: "bg-lavender-deep",
  },
  {
    name: "açúcar",
    unit: ["colher", "colheres"],
    base: 4,
    color: "bg-glauco-mid",
  },
];

const MAX_PEOPLE = 20;

/**
 * Receita de bolo para 4 pessoas. Mexa no número de pessoas: todo
 * ingrediente cresce na mesma proporção, e a porcentagem conta quanto da
 * receita original você está fazendo.
 */
export function ReceitaProporcao({ markDone }: { markDone: MarkDone }) {
  const [people, setPeople] = useState(BASE_PEOPLE);
  const flour = scaleAmount(2, BASE_PEOPLE, people);

  useEffect(() => {
    if (people === 8) markDone("dobro");
    if (people === 2) markDone("metade");
    if (flour === 5) markDone("cinco-xicaras");
  }, [people, flour, markDone]);

  const maxBar = scaleAmount(4, BASE_PEOPLE, MAX_PEOPLE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[13px] font-bold text-muted">Bolo para</p>
          <p className="font-display text-[34px] leading-none">
            {people} {people === 1 ? "pessoa" : "pessoas"}
          </p>
        </div>
        <p className="text-right" aria-live="polite">
          <span className="font-display text-[30px] leading-none">
            {percentOf(people, BASE_PEOPLE)}%
          </span>
          <span className="block text-[12px] font-bold text-muted">
            da receita original
          </span>
        </p>
      </div>

      <div className="flex flex-wrap gap-1" aria-hidden>
        {Array.from({ length: people }, (_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full ${i < BASE_PEOPLE ? "bg-night" : "bg-lavender-deep"} animate-rise`}
          />
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-muted">
          Quantas pessoas?
        </span>
        <input
          type="range"
          min={1}
          max={MAX_PEOPLE}
          value={people}
          onChange={(e) => setPeople(Number(e.target.value))}
          className="h-11 w-full accent-[var(--p-night)]"
        />
      </label>

      <ul className="flex flex-col gap-2.5" aria-live="polite">
        {INGREDIENTS.map((ing) => {
          const amount = scaleAmount(ing.base, BASE_PEOPLE, people);
          return (
            <li key={ing.name} className="flex flex-col gap-1">
              <span className="flex justify-between text-[14px]">
                <span className="font-bold capitalize">{ing.name}</span>
                <span className="tabular-nums">
                  {friendlyAmount(amount)}{" "}
                  {amount > 1 ? ing.unit[1] : ing.unit[0]}
                </span>
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-line">
                <span
                  className={`block h-full rounded-full ${ing.color} motion-safe:transition-[width] motion-safe:duration-300`}
                  style={{ width: `${(amount / maxBar) * 100}%` }}
                />
              </span>
            </li>
          );
        })}
      </ul>

      <p className="rounded-[12px] bg-bg px-4 py-3 text-[14px] leading-snug text-muted">
        {people === BASE_PEOPLE
          ? "Essa é a receita original. Arraste para mudar."
          : `Cada ingrediente virou ${friendlyAmount(people / BASE_PEOPLE)} vez(es) o original. ${
              Number.isInteger((3 * people) / BASE_PEOPLE)
                ? ""
                : "Dá para usar meio ovo?"
            }`}
      </p>
    </div>
  );
}
