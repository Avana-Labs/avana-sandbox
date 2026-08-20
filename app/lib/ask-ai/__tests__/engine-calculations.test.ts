import { describe, expect, it } from "vitest"
import {
  calculateAskAIBorrowSimulation,
  calculateLendProjection,
  calculateMultiplyStress,
  decodeBorrowRiskSnapshot,
  deriveAskAIUmbrellaStatus,
} from "../engine-calculations"

describe("Ask AI engine calculations", () => {
  it("simulates an exact additional borrow with deterministic risk values", () => {
    expect(
      calculateAskAIBorrowSimulation({
        collateralValueUsd: 10_000,
        debtValueUsd: 3_500,
        additionalBorrowAmountUsd: 1_000,
        maxLtvPct: 55,
        liquidationThresholdPct: 65,
      }),
    ).toMatchObject({
      current: { ltv: 0.35, healthFactor: 1.8571428571428572 },
      projected: { debtValueUsd: 4_500, ltv: 0.45, healthFactor: 1.4444444444444444 },
      remainingBorrowCapacityUsd: 1_000,
      overMaxBorrowLtv: false,
      liquidatable: false,
      riskLevel: "elevated",
    })
  })

  it("decodes Credit Engine fixed-point risk without changing units", () => {
    expect(
      decodeBorrowRiskSnapshot({
        collateralValueUsd6: "100000000",
        borrowCapacityUsd6: "70000000",
        availableBorrowCapacityUsd6: "20000000",
        totalBorrowedUsd6: "50000000",
        currentLtvWad: "500000000000000000",
        healthFactorWad: "1400000000000000000",
      }),
    ).toEqual({
      collateralValueUsd: 100,
      borrowCapacityUsd: 70,
      availableBorrowCapacityUsd: 20,
      totalBorrowedUsd: 50,
      currentLtv: 0.5,
      healthFactor: 1.4,
    })
  })

  it("uses the Lend Engine for a 30-day yield projection", () => {
    expect(calculateLendProjection({ principalUsd: 10_000, supplyApyPct: 4, rewardsApyPct: 1, days: 30 })).toEqual({
      totalApyPct: 5,
      projectedYieldUsd: 10_000 * 0.05 * (30 / 365),
      days: 30,
    })
  })

  it("uses the Multiply Engine to stress health after a collateral shock", () => {
    expect(
      calculateMultiplyStress({
        collateralValueUsd: 2_000,
        debtValueUsd: 1_000,
        liquidationThresholdPct: 80,
        collateralPriceShockPct: -20,
      }),
    ).toEqual({ collateralPriceShockPct: -20, shockedCollateralValueUsd: 1_600, ltv: 0.625, healthFactor: 1.28 })
  })

  it("derives Umbrella lifecycle state from persisted cooldown fields", () => {
    expect(
      deriveAskAIUmbrellaStatus({
        status: "open",
        suppliedUsd6: "100000000",
        cooldownAmountUsd6: "25000000",
        cooldownEndsAt: 2_000,
        now: 1_000,
      }),
    ).toBe("partiallyCooling")
  })
})
