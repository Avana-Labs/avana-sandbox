import { describe, expect, it } from "vitest"
import { mapLendPreviewToActionUi } from "@/app/lib/action-system/adapters/lend-preview-mapper"

describe("lend preview mapper", () => {
  it("maps lend preview metrics for configure stage", () => {
    const ui = mapLendPreviewToActionUi(
      {
        allowed: true,
        warnings: [],
        validationErrors: [],
        before: {
          suppliedAmount: 0,
          suppliedValueUsd: 0,
          principalAmount: 0,
          interestEarned: 0,
          rewardsEarnedUsd: 0,
          totalEarnedUsd: 0,
          currentApy: 0.0136,
        },
        after: {
          suppliedAmount: 1,
          suppliedValueUsd: 1,
          principalAmount: 1,
          interestEarned: 0,
          rewardsEarnedUsd: 0,
          totalEarnedUsd: 0,
          currentApy: 0.0136,
        },
      },
      {
        symbol: "ETH",
        amount: 1,
        marketLabel: "Main · Core",
        balanceLabel: "Balance",
        balanceAmount: 0.5,
        rateLabel: "Deposit APY",
      },
    )

    expect(ui.rateLabel).toBe("Deposit APY")
    expect(ui.metrics.some((row) => row.label === "Supplied value")).toBe(true)
  })
})
