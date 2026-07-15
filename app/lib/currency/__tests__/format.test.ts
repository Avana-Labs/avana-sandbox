import { describe, expect, it } from "vitest"
import {
  currencyContext,
  convertFromUsd,
  formatCompactCurrency,
  formatExactCurrency,
  redenominateCompactUsd,
} from "@/app/lib/currency/format"

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

describe("redenominateCompactUsd", () => {
  it("returns the string unchanged when the active currency is USD", () => {
    expect(redenominateCompactUsd("$312.4M", currencyContext("USD"))).toBe("$312.4M")
  })

  it("re-denominates a compact USD magnitude into the active currency", () => {
    // $312.4M * 0.92 ≈ €287.4M
    expect(redenominateCompactUsd("$312.4M", currencyContext("EUR"))).toBe("€287.4M")
  })

  it("handles B / K suffixes and thousands separators", () => {
    expect(redenominateCompactUsd("$1.6B", currencyContext("CNY"))).toBe("¥11.5B")
    expect(redenominateCompactUsd("$4,050", currencyContext("EUR"))).toBe("€3,726.00")
  })

  it("preserves decimals for sub-thousand token prices", () => {
    // A token price ($883.74) keeps cents so it matches the live tooltip.
    expect(redenominateCompactUsd("$100.00", currencyContext("EUR"))).toBe("€92.00")
  })

  it("preserves positive dust without mixing currency symbols", () => {
    expect(redenominateCompactUsd("<$0.01", currencyContext("EUR"))).toBe("<€0.01")
    expect(redenominateCompactUsd("<$0.01", currencyContext("JPY"))).toBe("<¥1")
  })

  it("re-signs negative magnitudes", () => {
    expect(redenominateCompactUsd("-$2.0M", currencyContext("EUR"))).toBe("-€1.8M")
  })

  it("leaves non-money strings (percentages, plain text) untouched", () => {
    expect(redenominateCompactUsd("62.1%", currencyContext("EUR"))).toBe("62.1%")
    expect(redenominateCompactUsd("Uniswap v3, Chainlink ETH", currencyContext("EUR"))).toBe(
      "Uniswap v3, Chainlink ETH",
    )
  })
})
