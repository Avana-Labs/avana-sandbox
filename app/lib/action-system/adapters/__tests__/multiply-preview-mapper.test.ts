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
      marketLabel: "WETH · USDC",
      collateralApy: 0.0382,
      borrowApy: 0.048,
      multiplier: 2.5,
    })

    expect(ui.marketBreakdown).toEqual({
      collateral: { symbol: "WETH", apy: "3.82%" },
      borrow: { symbol: "USDC", apy: "4.80%" },
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Exposure",
      "Estimated debt",
      "LTV",
      "Health factor",
      "Net APY",
      "Liquidation price",
    ])
    expect(ui.metrics.find((row) => row.id === "liq-price")?.value).not.toBe("—")
    const netApyRow = ui.metrics.find((row) => row.id === "net-apy")
    expect(netApyRow?.before).not.toBe(netApyRow?.after)
  })

  it("maps deleverage unwind metrics", () => {
    const ui = mapDeleveragePreviewToActionUi(preview, {
      marketLabel: "WETH · USDC",
      targetMultiplier: 1.5,
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Exposure",
      "Estimated debt",
      "LTV",
      "Health factor",
      "Net APY",
      "Liquidation price",
    ])
    expect(ui.amountLabel).toContain("1.50x target")
  })
})
