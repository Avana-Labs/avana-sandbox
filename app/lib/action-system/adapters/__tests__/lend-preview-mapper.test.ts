import { describe, expect, it } from "vitest"
import {
  mapLendDepositPreviewToActionUi,
  mapLendWithdrawPreviewToActionUi,
} from "@/app/lib/action-system/adapters/lend-preview-mapper"
import { lendPreviewFixture } from "@/app/lib/action-system/__tests__/fixtures"

describe("lend preview mappers", () => {
  const preview = lendPreviewFixture()

  it("maps deposit metrics including rewards rows", () => {
    const ui = mapLendDepositPreviewToActionUi(preview, {
      symbol: "GHO",
      amount: 50,
      marketLabel: "GHO · Core",
      balanceAmount: 500,
      rewardsApy: 1.2,
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Supplied value",
      "APY",
      "Rewards APY",
      "Rewards earned",
      "Lifetime earnings",
    ])
    expect(ui.metrics.find((row) => row.id === "total-earned")).toMatchObject({ value: "$10.50" })
    expect(ui.amountUsdLabel).toBe("$50.00")
  })

  it("maps withdraw-specific metrics", () => {
    const withdrawPreview = lendPreviewFixture({
      maxWithdrawable: 10,
      after: {
        suppliedAmount: 75,
        suppliedValueUsd: 75,
        principalAmount: 70,
        interestEarned: 5,
        rewardsEarnedUsd: 2,
        totalEarnedUsd: 7,
        currentApy: 4.2,
      },
    })
    const ui = mapLendWithdrawPreviewToActionUi(withdrawPreview, {
      symbol: "GHO",
      amount: 25,
      marketLabel: "GHO · Core",
      balanceAmount: 150,
      poolAvailableLiquidity: 80,
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Supplied remaining",
      "APY impact",
      "Accrued earnings",
      "Wallet withdrawable",
      "Pool liquidity",
      "Accrued interest",
    ])
    expect(ui.metrics.find((row) => row.id === "withdrawable-balance")?.value).toBe("10 GHO")
    expect(ui.metrics.find((row) => row.id === "pool-liquidity")?.value).toBe("80 GHO")
    expect(ui.metrics.find((row) => row.id === "interest-inclusion")?.value).toBe("Included in supplied balance")
    expect(ui.rateLabel).toBe("Remaining supply")
    expect(ui.amountUsdLabel).toBe("$25.00")
    expect(ui.maxAmount).toBe(10)
  })
})
