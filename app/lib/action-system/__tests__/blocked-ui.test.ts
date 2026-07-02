import { describe, expect, it } from "vitest"
import { mapPreviewToBlockedUi } from "@/app/lib/action-system/blocked-ui"
import { actionPagePath } from "@/app/lib/action-system/contracts"

describe("mapPreviewToBlockedUi", () => {
  it("maps insufficient balance to deposit CTA for borrow", () => {
    const blocked = mapPreviewToBlockedUi({
      product: "borrow",
      kind: "borrow",
      blockedReason: "Insufficient balance to borrow",
    })

    expect(blocked?.title).toBe("No balance available")
    expect(blocked?.primaryCtaHref).toBe(actionPagePath("borrow", "supply"))
  })

  it("maps collateral deposit requirement to supply route", () => {
    const blocked = mapPreviewToBlockedUi({
      product: "borrow",
      kind: "borrow",
      blockedReason: "Deposit collateral before borrowing",
    })

    expect(blocked?.title).toContain("deposit an asset")
    expect(blocked?.primaryCtaHref).toBe(actionPagePath("borrow", "supply"))
  })

  it("shows an exceeds-balance message when the wallet holds the asset", () => {
    const blocked = mapPreviewToBlockedUi({
      product: "lend",
      kind: "deposit",
      blockedReason: "Insufficient wallet balance.",
      hasWalletBalance: true,
    })

    expect(blocked?.title).toBe("Amount exceeds your balance")
    expect(blocked?.description).toContain("more than you hold")
  })

  it("shows the no-asset message when the wallet holds none of the asset", () => {
    const blocked = mapPreviewToBlockedUi({
      product: "lend",
      kind: "deposit",
      blockedReason: "Insufficient wallet balance.",
      hasWalletBalance: false,
    })

    expect(blocked?.title).toBe("You don't have this asset in your wallet")
  })

  it("returns null when there is no blocked reason", () => {
    expect(mapPreviewToBlockedUi({ product: "lend", kind: "deposit", blockedReason: null })).toBeNull()
  })
})
