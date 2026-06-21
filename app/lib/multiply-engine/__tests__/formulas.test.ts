import { describe, expect, it } from "vitest"
import {
  calculateLiquidationPrice,
  calculateMultiplyHealthFactor,
  calculateMultiplyLtv,
  calculateNetApy,
  calculateSafeMaxMultiplier,
  calculateTheoreticalMaxMultiplier,
  calculateTotalExposure,
} from "@/app/lib/multiply-engine"

describe("multiply engine formulas", () => {
  it("calculates theoretical max multiplier", () => {
    expect(calculateTheoreticalMaxMultiplier(0.73)).toBeCloseTo(3.7037, 3)
  })

  it("calculates safe max multiplier", () => {
    const theoretical = calculateTheoreticalMaxMultiplier(0.73)
    expect(
      calculateSafeMaxMultiplier({
        publicMaxMultiplier: 2.2,
        theoreticalMaxMultiplier: theoretical,
        minHealthFactor: 1.3,
        liquidationThreshold: 0.8,
      }),
    ).toBeCloseTo(2.2, 5)
  })

  it("calculates exposure, ltv, health factor, liquidation, and net apy", () => {
    const initialCollateralValueUsd = 3500
    const selectedMultiplier = 2.5
    const totalExposure = calculateTotalExposure(initialCollateralValueUsd, selectedMultiplier)
    const debtValueUsd = totalExposure - initialCollateralValueUsd
    const ltv = calculateMultiplyLtv(debtValueUsd, totalExposure)
    const healthFactor = calculateMultiplyHealthFactor(totalExposure, debtValueUsd, 0.8)
    const liquidationPrice = calculateLiquidationPrice({
      debtValueUsd,
      collateralAmount: 2.5,
      liquidationThreshold: 0.8,
    })
    const netApy = calculateNetApy({
      supplyApy: 0.0382,
      borrowApy: 0.039,
      finalCollateralValueUsd: totalExposure,
      debtValueUsd,
      initialCollateralValueUsd,
    })

    expect(totalExposure).toBe(8750)
    expect(debtValueUsd).toBe(5250)
    expect(ltv).toBeCloseTo(0.6, 5)
    expect(healthFactor).toBeCloseTo(1.3333, 3)
    expect(liquidationPrice).toBeCloseTo(2625, 0)
    expect(netApy).toBeCloseTo(0.037, 2)
  })
})
