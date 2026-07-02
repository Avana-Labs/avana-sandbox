import { describe, expect, it } from "vitest"
import {
  buildMultiplyOverCapPreviewUi,
  exceedsMultiplyCollateralCap,
  maxMultiplyCollateralAmount,
  multiplyOverCapReason,
} from "@/app/lib/multiply-system/collateral-limits"

describe("multiply collateral limits", () => {
  it("derives the max collateral amount from market liquidity and price", () => {
    expect(maxMultiplyCollateralAmount(8_400_000, 280)).toBe(30_000)
    expect(maxMultiplyCollateralAmount(5_000_000, 2_500)).toBe(2_000)
  })

  it("returns null when liquidity or price is missing or non-finite", () => {
    expect(maxMultiplyCollateralAmount(0, 280)).toBeNull()
    expect(maxMultiplyCollateralAmount(8_400_000, 0)).toBeNull()
    expect(maxMultiplyCollateralAmount(Number.NaN, 280)).toBeNull()
    expect(maxMultiplyCollateralAmount(8_400_000, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it("flags amounts over the cap and absurd/non-finite magnitudes", () => {
    const max = maxMultiplyCollateralAmount(8_400_000, 280)! // 30,000
    expect(exceedsMultiplyCollateralCap(999_999_999, max)).toBe(true)
    expect(exceedsMultiplyCollateralCap(30_001, max)).toBe(true)
    expect(exceedsMultiplyCollateralCap(30_000, max)).toBe(false)
    expect(exceedsMultiplyCollateralCap(1, max)).toBe(false)
    expect(exceedsMultiplyCollateralCap(Number.POSITIVE_INFINITY, max)).toBe(true)
  })

  it("never blocks when no cap is known", () => {
    expect(exceedsMultiplyCollateralCap(999_999_999, null)).toBe(false)
  })

  it("builds a blocked preview with a clear over-cap reason", () => {
    const ui = buildMultiplyOverCapPreviewUi({
      collateralSymbol: "ETH",
      borrowSymbol: "USDT",
      collateralAmount: 999_999_999,
      collateralPriceUsd: 2_500,
      marketLabel: "ETH · USDT",
      multiplier: 3,
      maxCollateralAmount: 2_000,
    })

    expect(ui.allowed).toBe(false)
    expect(ui.blockedReason).toBe(multiplyOverCapReason("ETH", 2_000))
    expect(ui.blockedReason).toContain("exceeds available market liquidity")
    expect(ui.validationErrors[0]).toBe(ui.blockedReason)
    expect(ui.metrics).toEqual([])
    expect(ui.balanceLabel).toBe("Available liquidity")
  })
})
