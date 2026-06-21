import { describe, expect, it } from "vitest"
import { mapRewardsClaimPreviewToActionUi } from "@/app/lib/action-system/adapters/rewards-preview-mapper"

describe("rewards preview mapper", () => {
  it("maps claim preview metrics", () => {
    const ui = mapRewardsClaimPreviewToActionUi({
      allowed: true,
      claimUsd: 24.5,
      tokenLabel: "AVAX rewards",
      marketLabel: "Rewards program",
    })

    expect(ui.amountUsdLabel).toBe("≈ $24.50")
    expect(ui.metrics[0]?.label).toBe("Claim amount")
  })
})
