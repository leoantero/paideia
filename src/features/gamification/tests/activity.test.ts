import { describe, expect, it } from "vitest";
import {
  deriveGamification,
  type ActivityEvent,
} from "@/src/features/gamification/activity-service";

/**
 * A ofensiva e as moedas aparecem numa tela que o RESPONSÁVEL também enxerga.
 * Número inflado aqui não é bug cosmético — é o produto mentindo para a
 * família sobre o esforço da criança. Por isso a regra tem teste.
 */

// Quarta-feira, para exercitar a semana começando na segunda.
const WEDNESDAY = new Date("2026-09-09T12:00:00Z");

const at = (iso: string, source = "tutor_turn"): ActivityEvent => ({
  source,
  occurred_at: iso,
});

describe("deriveGamification", () => {
  it("aluno sem nenhuma evidência não ganha ofensiva nem moeda", () => {
    const s = deriveGamification([], WEDNESDAY);
    expect(s.streak).toBe(0);
    expect(s.coins).toBe(0);
    expect(s.week).toEqual([false, false, false, false, false, false, false]);
  });

  it("conta dias CONSECUTIVOS, não dias soltos na semana", () => {
    // segunda e quarta: 2 dias ativos na semana, mas a ofensiva é só de hoje
    const s = deriveGamification(
      [at("2026-09-07T10:00:00Z"), at("2026-09-09T10:00:00Z")],
      WEDNESDAY
    );
    expect(s.week[0]).toBe(true); // seg
    expect(s.week[1]).toBe(false); // ter — o buraco que quebra a ofensiva
    expect(s.week[2]).toBe(true); // qua
    expect(s.streak).toBe(1);
  });

  it("acumula ofensiva em dias encadeados", () => {
    const s = deriveGamification(
      [
        at("2026-09-07T10:00:00Z"),
        at("2026-09-08T10:00:00Z"),
        at("2026-09-09T10:00:00Z"),
      ],
      WEDNESDAY
    );
    expect(s.streak).toBe(3);
  });

  it("a ofensiva não quebra antes do dia acabar", () => {
    // estudou ontem e anteontem, ainda não estudou hoje
    const s = deriveGamification(
      [at("2026-09-07T10:00:00Z"), at("2026-09-08T10:00:00Z")],
      WEDNESDAY
    );
    expect(s.streak).toBe(2);
  });

  it("dá 5 moedas por dia ativo", () => {
    const s = deriveGamification(
      [at("2026-09-08T10:00:00Z"), at("2026-09-09T10:00:00Z")],
      WEDNESDAY
    );
    expect(s.coins).toBe(10);
  });

  it("dá 2 moedas por card de revisão, com teto diário", () => {
    // 20 revisões no mesmo dia = 40 moedas sem teto; o teto corta em 20
    const many = Array.from({ length: 20 }, () =>
      at("2026-09-09T10:00:00Z", "retrieval_review")
    );
    const s = deriveGamification(many, WEDNESDAY);
    expect(s.coins).toBe(5 + 20); // 1 dia ativo + teto de revisão
  });

  it("vários eventos no mesmo dia contam como UM dia ativo", () => {
    const s = deriveGamification(
      [
        at("2026-09-09T08:00:00Z"),
        at("2026-09-09T14:00:00Z"),
        at("2026-09-09T20:00:00Z"),
      ],
      WEDNESDAY
    );
    expect(s.streak).toBe(1);
    expect(s.coins).toBe(5);
  });

  it("bonifica a semana completa (seg a dom)", () => {
    const fullWeek = [
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ].map((d) => at(`${d}T10:00:00Z`));
    const s = deriveGamification(fullWeek, WEDNESDAY);
    // 7 dias ativos (35) + bônus de semana (20)
    expect(s.coins).toBe(35 + 20);
  });
});
