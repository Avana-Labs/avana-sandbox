import { describe, expect, it } from "vitest"
import {
  clampMultiplyDefaultMultiplier,
  hasMultiplyLiquidationRisk,
  MULTIPLY_PREFERRED_DEFAULT_MULTIPLIER,
} from "@/app/lib/action-system/multiply-defaults"

describe("multiply defaults", () => {
  it("prefers 1.5x when market max allows it", () => {
    expect(clampMultiplyDefaultMultiplier(5)).toBe(String(MULTIPLY_PREFERRED_DEFAULT_MULTIPLIER))
  })

  it("clamps to market public max when below 1.5", () => {
    expect(clampMultiplyDefaultMultiplier(1.2)).toBe("1.2")
  })

  it("detects liquidation risk validation messages", () => {
    expect(hasMultiplyLiquidationRisk(["Multiplier exceeds the public maximum for this market."])).toBe(false)
    expect(hasMultiplyLiquidationRisk(["Health factor is below the market minimum."])).toBe(true)
  })
})
