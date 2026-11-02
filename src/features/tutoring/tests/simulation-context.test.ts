import { describe, expect, it } from "vitest";
import { findSimulation } from "@/src/features/simulations/catalog";
import { buildSimulationContext } from "@/src/features/tutoring/simulation-context";

describe("buildSimulationContext", () => {
  it("names the simulation and keeps the tutor from solving its challenges", () => {
    const ctx = buildSimulationContext(findSimulation("balanca-equacao")!);
    expect(ctx).toContain("A balança em equilíbrio");
    expect(ctx).toContain("Descubra o x da primeira balança.");
    expect(ctx).toMatch(/não resolva os desafios por ele/);
  });
});
