import { describe, expect, it } from "vitest";
import {
  DEFAULT_BKT_PARAMS,
  nextReview,
  replayMastery,
  signalToObservation,
  updateMastery,
} from "../bkt";

describe("BKT — propriedades que nao podem quebrar", () => {
  it("acerto sobe o dominio, erro desce", () => {
    const prior = 0.5;
    expect(updateMastery(prior, "correct", 1)).toBeGreaterThan(prior);
    expect(updateMastery(prior, "incorrect", 1)).toBeLessThan(prior);
  });

  it("insight move mais que correct", () => {
    const a = updateMastery(0.5, "insight", 1);
    const b = updateMastery(0.5, "correct", 1);
    expect(a).toBeGreaterThan(b);
  });

  it("evidencia ruidosa move menos que evidencia limpa", () => {
    const ruidosa = updateMastery(0.5, "correct", 0.3);
    const limpa = updateMastery(0.5, "correct", 0.95);
    expect(limpa - 0.5).toBeGreaterThan(ruidosa - 0.5);
  });

  it("acertar o dificil vale mais que acertar o facil", () => {
    const dificil = updateMastery(0.5, "correct", 1, 0.9);
    const facil = updateMastery(0.5, "correct", 1, 0.1);
    expect(dificil).toBeGreaterThan(facil);
  });

  it("fica sempre em (0,1)", () => {
    let m = 0.5;
    for (let i = 0; i < 200; i++) m = updateMastery(m, "correct", 1);
    expect(m).toBeLessThan(1);
    expect(m).toBeGreaterThan(0.9);

    m = 0.5;
    for (let i = 0; i < 200; i++) m = updateMastery(m, "incorrect", 1);
    expect(m).toBeGreaterThan(0);
  });

  // Erro infinito NAO leva o dominio a zero: a transicao de aprendizado do BKT
  // e incondicional, entao o piso converge para ~pLearn (medido: 0.137 com
  // pLearn=0.12). Isso e comportamento correto e desejavel -- "nunca vai
  // aprender" nao e uma afirmacao que o modelo deve fazer sobre uma crianca.
  // Se quiser um piso mais baixo, baixe pLearn; nao clampe na saida.
  it("piso de dominio converge para ~pLearn, nao para zero", () => {
    let m = 0.5;
    for (let i = 0; i < 200; i++) m = updateMastery(m, "incorrect", 1);
    expect(m).toBeGreaterThan(DEFAULT_BKT_PARAMS.pLearn * 0.9);
    expect(m).toBeLessThan(DEFAULT_BKT_PARAMS.pLearn * 1.5);
  });

  it("replay e deterministico — mesma evidencia, mesmo numero", () => {
    const ev = [
      { signal: "correct" as const, confidence: 0.5 },
      { signal: "struggling" as const, confidence: 0.4 },
      { signal: "insight" as const, confidence: 0.9 },
    ];
    expect(replayMastery(ev)).toEqual(replayMastery(ev));
  });

  it("confianca cresce com a massa de evidencia e satura", () => {
    const um = replayMastery([{ signal: "correct", confidence: 0.5 }]);
    const muitos = replayMastery(
      Array.from({ length: 20 }, () => ({ signal: "correct" as const, confidence: 0.5 }))
    );
    expect(muitos.confidence).toBeGreaterThan(um.confidence);
    expect(muitos.confidence).toBeLessThan(1);
  });

  it("sem evidencia, dominio = prior", () => {
    expect(replayMastery([]).mastery).toBe(DEFAULT_BKT_PARAMS.pInit);
    expect(replayMastery([]).confidence).toBe(0);
  });

  it("todo sinal tem observacao definida", () => {
    for (const s of ["correct", "partial", "incorrect", "struggling", "insight"] as const) {
      expect(signalToObservation(s).weight).toBeGreaterThan(0);
    }
  });
});

describe("agenda de revisao", () => {
  it("dominio alto estica, dominio baixo colapsa", () => {
    expect(nextReview(0.95, 10).intervalDays).toBeGreaterThan(10);
    expect(nextReview(0.2, 10).intervalDays).toBeLessThan(10);
  });

  it("nunca abaixo de 1 dia nem acima de 180", () => {
    expect(nextReview(0.01, 1).intervalDays).toBeGreaterThanOrEqual(1);
    expect(nextReview(0.99, 500).intervalDays).toBeLessThanOrEqual(180);
  });
});
