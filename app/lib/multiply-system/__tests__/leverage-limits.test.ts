import { describe, expect, it } from "vitest"
import {
  MULTIPLY_ACTION_MAX_LEVERAGE,
  getDeleverageMultiplierMax,
  getDefaultDeleverageMultiplier,
  resolveMultiplyMarketMaxLeverage,
} from "@/app/lib/multiply-system/leverage-limits"

describe("resolveMultiplyMarketMaxLeverage", () => {
  it("converts the catalog display cap back into the real action cap", () => {
    expect(resolveMultiplyMarketMaxLeverage(5.4)).toBe(1.8)
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

  it("caps deleverage at a valid target below the current multiplier", () => {
    expect(getDeleverageMultiplierMax(2)).toBe(1.9)
    expect(getDeleverageMultiplierMax(1.6)).toBe(1.5)
    expect(getDeleverageMultiplierMax(Number.NaN)).toBe(1)
  })
})
