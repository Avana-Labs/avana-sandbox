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
      maxLtv: 0.8,
    })

    expect(ui.marketBreakdown).toEqual({
      collateral: { symbol: "WETH", apy: "3.82%" },
      borrow: { symbol: "USDC", apy: "4.80%" },
    })
    expect(ui.rateLabel).toBe("")
    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Collateral supplied",
      "Collateral value",
      "Target leverage",
      "Looped exposure",
      "USDC borrowed",
      "Borrow capacity remaining",
      "Projected LTV",
      "Projected health factor",
      "Projected net APY",
      "Liquidation price",
    ])
    expect(ui.amountLabel).toBe("2 WETH")
    expect(ui.amountValue).toBe("2")
    expect(ui.amountUsdLabel).toBe("≈ $7,000")
    expect(ui.balanceLabel).toBe("Selected leverage")
    expect(ui.metrics.find((row) => row.id === "looped-exposure")?.value).toBe("$2,000")
    expect(ui.metrics.find((row) => row.id === "borrow-capacity")?.value).toBe("$2,100")
    expect(ui.metrics.find((row) => row.id === "borrow-capacity")?.tone).toBe("warning")
    expect(ui.metrics.find((row) => row.id === "liq-price")?.value).not.toBe("—")
  })

  it("revalues the full preview from the live collateral oracle price", () => {
    const ui = mapMultiplyPreviewToActionUi(preview, {
      collateralSymbol: "AAVE",
      borrowSymbol: "GHO",
      collateralAmount: 2,
      collateralPriceUsd: 140,
      catalogCollateralPriceUsd: 280,
      marketLabel: "AAVE · GHO",
      collateralApy: 0.076,
      borrowApy: 0.039,
      multiplier: 2.5,
      maxLtv: 0.5,
    })

    expect(ui.amountUsdLabel).toBe("≈ $280")
    expect(ui.metrics.find((row) => row.id === "collateral-value")?.value).toBe("$280")
    expect(ui.metrics.find((row) => row.id === "looped-exposure")?.value).toBe("$1,000")
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
