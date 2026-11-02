"use client";

import type { ComponentType } from "react";
import { findSimulation } from "@/src/features/simulations/catalog";
import { BalancaEquacao } from "./BalancaEquacao";
import { BarbanteCercado } from "./BarbanteCercado";
import { FracoesPizza } from "./FracoesPizza";
import { ReceitaProporcao } from "./ReceitaProporcao";
import { SimulationFrame, type MarkDone } from "./SimulationFrame";
import { TermometroElevador } from "./TermometroElevador";

const STAGES: Record<string, ComponentType<{ markDone: MarkDone }>> = {
  "fracoes-pizza": FracoesPizza,
  "termometro-elevador": TermometroElevador,
  "balanca-equacao": BalancaEquacao,
  "receita-proporcao": ReceitaProporcao,
  "barbante-cercado": BarbanteCercado,
};

export function SimulationScreen({
  slug,
  basePath = "/student",
  completeEndpoint = "/api/simulations/complete",
  alreadyCompleted,
}: {
  slug: string;
  basePath?: string;
  completeEndpoint?: string;
  alreadyCompleted: boolean;
}) {
  const meta = findSimulation(slug);
  const Stage = STAGES[slug];
  if (!meta || !Stage) return null;
  return (
    <SimulationFrame
      meta={meta}
      basePath={basePath}
      completeEndpoint={completeEndpoint}
      alreadyCompleted={alreadyCompleted}
    >
      {(markDone) => <Stage markDone={markDone} />}
    </SimulationFrame>
  );
}
