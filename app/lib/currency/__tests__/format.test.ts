import { describe, expect, it } from "vitest"
import { currencyContext, convertFromUsd, formatCompactCurrency, formatExactCurrency } from "@/app/lib/currency/format"

describe("currency formatting", () => {
  it("USD is identity", () => {
    const ctx = currencyContext("USD")
    expect(ctx.rate).toBe(1)
    expect(convertFromUsd(1_600_000, ctx)).toBe(1_600_000)
    expect(formatCompactCurrency(1_600_000, ctx)).toBe("$1.6M")
  })

  it("converts USD to the selected currency using its rate + symbol", () => {
    const ctx = currencyContext("CNY")
    expect(ctx.symbol).toBe("¥")
    expect(convertFromUsd(100, ctx)).toBeCloseTo(718, 0)
    // $1.6M * 7.18 ≈ ¥11.5M
    expect(formatCompactCurrency(1_600_000, ctx)).toBe("¥11.5M")
  })

  it("honors an explicit rate override (e.g. live FX)", () => {
    const ctx = currencyContext("EUR", 0.9)
    expect(convertFromUsd(1000, ctx)).toBe(900)
  })

  it("uses zero decimals for zero-decimal currencies in exact formatting", () => {
    expect(formatExactCurrency(10, currencyContext("JPY"))).toBe("¥1,510")
    expect(formatExactCurrency(10, currencyContext("USD"))).toBe("$10.00")
  })

  it("handles negative values with a leading sign", () => {
    expect(formatCompactCurrency(-2_000_000, currencyContext("USD"))).toBe("-$2.0M")
  })
})
