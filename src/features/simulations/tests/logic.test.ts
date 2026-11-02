import { describe, expect, it } from "vitest";
import {
  balanceFor,
  bestFenceWidth,
  equivalentFraction,
  fenceArea,
  friendlyAmount,
  isSolved,
  moveExpression,
  percentOf,
  removeFromBoth,
  removeFromLeftOnly,
  sameAmount,
  scaleAmount,
  solveLinear,
  splitIntoGroups,
} from "../logic";

describe("fractions", () => {
  it("finds the simplest equivalent fraction", () => {
    expect(equivalentFraction(2, 4)).toBe("1/2");
    expect(equivalentFraction(4, 8)).toBe("1/2");
    expect(equivalentFraction(6, 8)).toBe("3/4");
    expect(equivalentFraction(3, 8)).toBeNull();
    expect(equivalentFraction(6, 6)).toBe("a pizza inteira");
  });

  it("compares amounts across different cuts", () => {
    expect(sameAmount(2, 4, 4, 8)).toBe(true);
    expect(sameAmount(2, 3, 3, 4)).toBe(false);
  });
});

describe("balance", () => {
  it("solves 3x + 2 = 11 by removing from both sides, then splitting", () => {
    let s = balanceFor(3, 2, 11);
    s = removeFromBoth(removeFromBoth(s));
    expect(s).toMatchObject({ xs: 3, left: 0, right: 9 });
    s = splitIntoGroups(s);
    expect(s).toMatchObject({ xs: 1, right: 3 });
    expect(isSolved(s)).toBe(true);
    expect(solveLinear(3, 2, 11)).toBe(3);
  });

  it("tips the scale when weight is removed from one side only", () => {
    const s = removeFromLeftOnly(balanceFor(2, 1, 9));
    expect(s.tilt).toBe(1);
    expect(removeFromBoth(s)).toBe(s);
  });

  it("does not split while there are loose weights next to x", () => {
    const s = balanceFor(2, 1, 9);
    expect(splitIntoGroups(s)).toBe(s);
  });
});

describe("recipe", () => {
  it("scales proportionally", () => {
    expect(scaleAmount(2, 4, 10)).toBe(5);
    expect(percentOf(6, 4)).toBe(150);
  });

  it("prints kitchen-friendly amounts", () => {
    expect(friendlyAmount(2.5)).toBe("2 e 1/2");
    expect(friendlyAmount(0.75)).toBe("3/4");
    expect(friendlyAmount(3)).toBe("3");
    expect(friendlyAmount(1 + 1 / 3)).toBe("1 e 1/3");
  });
});

describe("fence", () => {
  it("keeps the perimeter and changes the area", () => {
    expect(fenceArea(24, 2)).toBe(20);
    expect(fenceArea(24, 6)).toBe(36);
    expect(bestFenceWidth(24)).toBe(6);
  });
});

describe("negative numbers", () => {
  it("writes the move as an expression", () => {
    expect(moveExpression({ from: -3, to: 2 })).toBe("−3 + 5 = 2");
    expect(moveExpression({ from: -2, to: -6 })).toBe("−2 − 4 = −6");
  });
});
