import { describe, expect, it } from "vitest"
import {
  MULTIPLY_ACTION_MAX_LEVERAGE,
  getDeleverageMultiplierMax,
  getDefaultDeleverageMultiplier,
  resolveDefaultMultiplyLeverage,
  resolveMultiplyMarketMaxLeverage,
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
