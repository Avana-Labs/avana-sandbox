import { describe, expect, it } from "vitest"
import {
  mapBorrowRewardsClaimPreviewToActionUi,
  mapRewardsClaimPreviewToActionUi,
} from "@/app/lib/action-system/adapters/rewards-preview-mapper"

describe("rewards preview mappers", () => {
  it("maps rewards claim points and token breakdown", () => {
    const ui = mapRewardsClaimPreviewToActionUi({
      allowed: true,
      claimUsd: 120,
      marketLabel: "Avana rewards",
      claimableTaskCount: 3,
      tokenBreakdown: [
        { symbol: "GHO", amount: 80 },
        { symbol: "USDC", amount: 40 },
      ],
    })

    expect(ui.metrics[0]).toMatchObject({ label: "Points to claim", value: "3" })
    expect(ui.metrics.map((row) => row.label)).toContain("GHO")
    expect(ui.metrics.map((row) => row.label)).toContain("USDC")
  })

  it("maps borrow-side claim per token", () => {
    const ui = mapBorrowRewardsClaimPreviewToActionUi({
      allowed: true,
      claimUsd: 55,
      marketLabel: "WETH · Core",
      tokenTotals: { WETH: 30, USDC: 25 },
    })

    expect(ui.metrics.map((row) => row.label)).toEqual(["WETH", "USDC"])
  })
})
