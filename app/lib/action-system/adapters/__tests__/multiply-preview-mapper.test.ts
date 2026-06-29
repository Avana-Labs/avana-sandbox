import { describe, expect, it } from "vitest"
import {
  mapDeleveragePreviewToActionUi,
  mapMultiplyPreviewToActionUi,
} from "@/app/lib/action-system/adapters/multiply-preview-mapper"
import { multiplyPreviewFixture } from "@/app/lib/action-system/__tests__/fixtures"

describe("multiply preview mappers", () => {
  const preview = multiplyPreviewFixture()

  it("maps multiply metrics including net APY and liquidation price", () => {
    const ui = mapMultiplyPreviewToActionUi(preview, {
      collateralSymbol: "WETH",
      borrowSymbol: "USDC",
      collateralAmount: 2,
      collateralPriceUsd: 3_500,
      marketLabel: "WETH · USDC",
      collateralApy: 0.0382,
      borrowApy: 0.048,
      multiplier: 2.5,
    })

    expect(ui.marketBreakdown).toEqual({
      collateral: { symbol: "WETH", apy: "3.82%" },
      borrow: { symbol: "USDC", apy: "4.80%" },
    })
    expect(ui.rateLabel).toBe("")
    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Exposure",
      "Estimated debt",
      "LTV",
      "Health factor",
      "Net APY",
      "Liquidation price",
    ])
    expect(ui.amountUsdLabel).toBe("≈ $7,000")
    expect(ui.metrics.find((row) => row.id === "exposure")?.before).toBeUndefined()
    expect(ui.metrics.find((row) => row.id === "exposure")?.value).toBe("$12,000")
    expect(ui.metrics.find((row) => row.id === "net-apy")?.before).toBeUndefined()
    expect(ui.metrics.find((row) => row.id === "liq-price")?.value).not.toBe("—")
  })

  it("maps deleverage unwind metrics", () => {
    const ui = mapDeleveragePreviewToActionUi(preview, {
      marketLabel: "WETH · USDC",
      targetMultiplier: 1.5,
      collateralSymbol: "WETH",
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Exposure",
      "Estimated debt",
      "LTV",
      "Health factor",
      "Net APY",
      "Liquidation price",
    ])
    expect(ui.amountLabel).toBe("1.50x WETH")
    expect(ui.amountValue).toBe("1.50x")
    expect(ui.assetSymbol).toBe("WETH")
  })
})
