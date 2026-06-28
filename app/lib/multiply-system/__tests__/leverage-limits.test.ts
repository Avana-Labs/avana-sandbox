import { describe, expect, it } from "vitest"
import {
  MULTIPLY_ACTION_MAX_LEVERAGE,
  getDefaultDeleverageMultiplier,
  resolveMultiplyMarketMaxLeverage,
} from "@/app/lib/multiply-system/leverage-limits"

describe("resolveMultiplyMarketMaxLeverage", () => {
  it("caps leverage at the market public maximum", () => {
    expect(resolveMultiplyMarketMaxLeverage(5.4)).toBe(5.4)
  })

  it("never exceeds the global action slider maximum", () => {
    expect(resolveMultiplyMarketMaxLeverage(20)).toBe(MULTIPLY_ACTION_MAX_LEVERAGE)
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
})
