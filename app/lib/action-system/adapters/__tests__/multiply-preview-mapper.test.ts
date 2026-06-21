import { describe, expect, it } from "vitest"
import { mapMultiplyPreviewToActionUi } from "@/app/lib/action-system/adapters/multiply-preview-mapper"

describe("multiply preview mapper", () => {
  it("maps multiply preview metrics for configure stage", () => {
    const ui = mapMultiplyPreviewToActionUi(
      {
        allowed: true,
        warnings: [],
        validationErrors: [],
        riskLabel: "safe",
        before: {
          collateralValueUsd: 1000,
          debtValueUsd: 0,
          ltv: 0,
          healthFactor: "infinity",
          netApy: 0.08,
          multiplier: 1,
        },
        after: {
          collateralValueUsd: 2000,
          debtValueUsd: 1000,
          ltv: 0.5,
          healthFactor: 2.1,
          netApy: 0.12,
          multiplier: 2,
        },
        simulationSummary: null,
      },
      {
        collateralSymbol: "ETH",
        collateralAmount: 1,
        marketLabel: "Main · Core",
        multiplier: 2,
      },
    )

    expect(ui.metrics.some((row) => row.label === "Estimated debt")).toBe(true)
    expect(ui.balanceValue).toBe("2.00x")
  })
})
