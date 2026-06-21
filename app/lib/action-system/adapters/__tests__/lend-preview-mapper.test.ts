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
      "Total earned",
    ])
  })

  it("maps withdraw-specific metrics", () => {
    const ui = mapLendWithdrawPreviewToActionUi(preview, {
      symbol: "GHO",
      amount: 25,
      marketLabel: "GHO · Core",
      balanceAmount: 150,
    })

    expect(ui.metrics.map((row) => row.label)).toEqual(["Supplied remaining", "APY impact", "Total earned"])
    expect(ui.rateLabel).toBe("Remaining supply")
  })
})
