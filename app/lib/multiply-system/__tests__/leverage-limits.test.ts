import { describe, expect, it } from "vitest"
import {
  MULTIPLY_ACTION_MAX_LEVERAGE,
  getDeleverageMultiplierMax,
  getDefaultDeleverageMultiplier,
  resolveDefaultMultiplyLeverage,
  resolveMultiplyMarketMaxLeverage,
  resolveRecommendedActionLeverage,
  snapMultiplierToStep,
} from "@/app/lib/multiply-system/leverage-limits"

describe("resolveMultiplyMarketMaxLeverage", () => {
  it("passes the (uninflated) catalog cap through as the action cap", () => {
    expect(resolveMultiplyMarketMaxLeverage(1.8)).toBe(1.8)
  })

  it("never exceeds the global action slider maximum", () => {
    expect(resolveMultiplyMarketMaxLeverage(60)).toBe(MULTIPLY_ACTION_MAX_LEVERAGE)
  })

  it("falls back to the global maximum for invalid market caps", () => {
    expect(resolveMultiplyMarketMaxLeverage(undefined)).toBe(MULTIPLY_ACTION_MAX_LEVERAGE)
    expect(resolveMultiplyMarketMaxLeverage(Number.NaN)).toBe(MULTIPLY_ACTION_MAX_LEVERAGE)
  })

  it("defaults deleverage below the current multiplier", () => {
    expect(getDefaultDeleverageMultiplier(2)).toBe("1.5")
    expect(getDefaultDeleverageMultiplier(1.2)).toBe("1")
    expect(getDefaultDeleverageMultiplier(Number.NaN)).toBe("1")
  })

  it("defaults new positions to conservative leverage within market limits", () => {
    expect(resolveDefaultMultiplyLeverage(4, 3)).toBe(1.1)
    expect(resolveDefaultMultiplyLeverage(1.3, 1.2)).toBe(1.1)
  })

  it("caps deleverage at a valid target below the current multiplier", () => {
    expect(getDeleverageMultiplierMax(2)).toBe(1.9)
    expect(getDeleverageMultiplierMax(1.6)).toBe(1.5)
    expect(getDeleverageMultiplierMax(Number.NaN)).toBe(1)
  })
})

describe("snapMultiplierToStep", () => {
  it("snaps to the slider step grid (same rule the ruler thumb uses)", () => {
    // 1.75 sits on a half-step; the slider rounds it to 1.8, so the controlled
    // state must land there too (E6: slider/number/summary share ONE value).
    expect(snapMultiplierToStep(1.75, 1, 1.8, 0.1)).toBe(1.8)
    expect(snapMultiplierToStep(1.73, 1, 1.8, 0.1)).toBe(1.7)
    expect(snapMultiplierToStep(1.2, 1, 2, 0.1)).toBe(1.2)
  })

  it("clamps to the [min, max] range", () => {
    expect(snapMultiplierToStep(9, 1, 1.8, 0.1)).toBe(1.8)
    expect(snapMultiplierToStep(0.4, 1, 1.8, 0.1)).toBe(1)
  })
})

describe("resolveRecommendedActionLeverage (E2)", () => {
  // aave-gho: LT 0.65, minHF 1.5, safe-max ~1.7647, action max 1.8. The old code
  // marked the recommended cap at ~1.76 which the slider snapped UP to 1.8x, where
  // HF = 0.65·1.8/0.8 = 1.4625 < 1.5 and the action was blocked. The recommended
  // ceiling must be a value the slider can actually land on that still clears min HF.
  it("returns a step-aligned recommended max the slider can reach without blocking", () => {
    const recommended = resolveRecommendedActionLeverage({
      recommendedMaxMultiplier: 1.7647,
      liquidationThreshold: 0.65,
      minHealthFactor: 1.5,
      actionMax: 1.8,
      step: 0.1,
    })
    // Reachable on the 0.1 grid and never above the analytic safe max.
    expect(recommended).toBeLessThanOrEqual(1.7647)
    // The analytic health factor at the recommended max clears the market minimum.
    const hf = (0.65 * recommended) / (recommended - 1)
    expect(hf).toBeGreaterThanOrEqual(1.5)
    expect(recommended).toBe(1.7)
  })

  it("never exceeds the action-slider max", () => {
    expect(
      resolveRecommendedActionLeverage({
        recommendedMaxMultiplier: 5,
        liquidationThreshold: 0.9,
        minHealthFactor: 1.12,
        actionMax: 3,
        step: 0.1,
      }),
    ).toBeLessThanOrEqual(3)
  })

  it("degrades to the minimum leverage when there is no room above 1x", () => {
    expect(
      resolveRecommendedActionLeverage({
        recommendedMaxMultiplier: 1,
        liquidationThreshold: 0.65,
        minHealthFactor: 1.5,
        actionMax: 1,
        step: 0.1,
      }),
    ).toBe(1)
  })
})
