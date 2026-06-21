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

  it("returns null when there is no blocked reason", () => {
    expect(mapPreviewToBlockedUi({ product: "lend", kind: "deposit", blockedReason: null })).toBeNull()
  })
})
