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
      collateralAmount: 2,
      marketLabel: "WETH · USDC",
      multiplier: 2.5,
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
