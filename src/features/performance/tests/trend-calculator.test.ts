import { describe, expect, it } from "vitest";
import { computeNextTrend } from "@/src/features/performance/trend-calculator";

describe("computeNextTrend", () => {
  it("stays 'stable' for the first two sessions", () => {
    expect(computeNextTrend(0)).toEqual({ sessionCount: 1, trend: "stable" });
    expect(computeNextTrend(1)).toEqual({ sessionCount: 2, trend: "stable" });
  });

  it("becomes 'improving' from the third session onward", () => {
    expect(computeNextTrend(2)).toEqual({ sessionCount: 3, trend: "improving" });
    expect(computeNextTrend(10)).toEqual({ sessionCount: 11, trend: "improving" });
  });
});
