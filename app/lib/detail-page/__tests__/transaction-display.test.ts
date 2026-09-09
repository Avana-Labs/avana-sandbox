import { describe, expect, it } from "vitest"
import { setCanonicalPrices, resetCanonicalPrices } from "@/app/lib/prices/canonical"
import {
  isUsdMirroredTokenLabel,
  resolvePoolTokenAmounts,
  resolvePoolUsdDisplay,
  resolveTransactionTokenDisplay,
  resolveTransactionUsdDisplay,
} from "@/app/lib/detail-page/transaction-display"
import type { DetailTransactionRow } from "@/app/lib/detail-page/transaction-history"

const baseRow = (overrides: Partial<DetailTransactionRow>): DetailTransactionRow => ({
  id: "1",
  at: "",
  kind: "supply",
  amountLabel: "$1.00K",
  txHashShort: "0x",
  ...overrides,
})

describe("transaction-display", () => {
  it("detects USD mirrored token labels", () => {
    expect(
      isUsdMirroredTokenLabel(baseRow({ amountLabel: "$37.50K", tokenAmountLabel: "37.50K", tokenSymbol: "OP" })),
    ).toBe(true)
    expect(
      isUsdMirroredTokenLabel(baseRow({ amountLabel: "$37.50K", tokenAmountLabel: "378,041.33", tokenSymbol: "OP" })),
    ).toBe(false)
  })

  it("keeps FOR fixed while USD tracks live price", () => {
    const row = baseRow({
      amountLabel: "$37.50K",
      tokenAmountLabel: "378,041.33",
      tokenSymbol: "OP",
    })
    expect(resolveTransactionTokenDisplay(row)).toEqual({ amount: "378,041.33", symbol: "OP" })

    setCanonicalPrices({ OP: 1.46 })
    expect(resolveTransactionUsdDisplay(row)).toBe("$551.9K")

    setCanonicalPrices({ OP: 0.73 })
    expect(resolveTransactionUsdDisplay(row)).toBe("$276.0K")
    expect(resolveTransactionTokenDisplay(row)).toEqual({ amount: "378,041.33", symbol: "OP" })

    resetCanonicalPrices()
  })

  it("derives frozen For from USD using seed fixture price", () => {
    const row = baseRow({
      amountLabel: "$37.50K",
      amountUsd: 37_500,
      tokenSymbol: "GHO",
    })
    expect(resolveTransactionTokenDisplay(row)).toEqual({ amount: "37,500", symbol: "GHO" })
    expect(resolveTransactionUsdDisplay(row)).toBe("$37.5K")
  })

  it("values pool USD from each constituent leg at live prices", () => {
    const row = baseRow({
      amountLabel: "$48.53K",
      token0AmountLabel: "10.1831",
      token1AmountLabel: "24,271.21",
      tokenSymbol: "WETH",
      tokenSymbolSecondary: "USDT",
    })
    setCanonicalPrices({ WETH: 1934, USDT: 1 })
    expect(resolvePoolUsdDisplay(row, "WETH", "USDT")).toBe("$44.0K")
    expect(resolvePoolTokenAmounts(row, "WETH", "USDT")).toEqual({
      token0Amount: "10.1831",
      token1Amount: "24,271.21",
    })

    setCanonicalPrices({ WETH: 1500, USDT: 1 })
    expect(resolvePoolUsdDisplay(row, "WETH", "USDT")).toBe("$39.5K")
    expect(resolvePoolTokenAmounts(row, "WETH", "USDT").token0Amount).toBe("10.1831")

    resetCanonicalPrices()
  })

  it("falls back to embedded amountLabel token pairs", () => {
    const row = baseRow({
      amountLabel: "+1200.0000 GHO",
      tokenSymbol: "GHO",
    })
    expect(resolveTransactionTokenDisplay(row)).toEqual({ amount: "1200.0000", symbol: "GHO" })
    expect(resolveTransactionUsdDisplay(row)).toBe("$1.2K")
  })

  it("does not treat multiply collateral rows as pool legs", () => {
    const row = baseRow({
      amountLabel: "+$50.0K",
      tokenAmountLabel: "25.8521",
      tokenSymbol: "WETH",
      tokenSymbolSecondary: "USDC",
    })
    setCanonicalPrices({ WETH: 1934, USDC: 1 })
    expect(resolveTransactionUsdDisplay(row)).toBe("$50.0K")
    expect(resolveTransactionTokenDisplay(row)).toEqual({ amount: "25.8521", symbol: "WETH" })
    resetCanonicalPrices()
  })

  it("keeps withdrawal USD negative from FOR × live price", () => {
    const row = baseRow({
      kind: "withdraw",
      amountLabel: "-$1.2K",
      tokenAmountLabel: "1,200",
      tokenSymbol: "GHO",
    })
    expect(resolveTransactionUsdDisplay(row)).toBe("-$1.2K")
  })
})
