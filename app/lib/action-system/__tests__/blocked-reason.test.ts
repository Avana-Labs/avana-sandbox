import { describe, expect, it } from "vitest"
import { humanizeBlockedReason } from "@/app/lib/action-system/blocked-reason"

describe("humanizeBlockedReason", () => {
  it("maps 'available credit in spoke' to plain copy without the spoke id", () => {
    const out = humanizeBlockedReason("Wallet wallet-1 does not have enough available credit in spoke uni-v3-bluechip")
    expect(out).toBe("You don't have enough borrowing power for this amount. Lower the amount or add collateral.")
    expect(out).not.toMatch(/spoke|wallet-1|insolvent/i)
  })

  it("maps borrow insolvency without leaking 'insolvent' or 'spoke'", () => {
    const out = humanizeBlockedReason("Borrowing would make spoke uni-v3-bluechip insolvent")
    expect(out).toBe("This borrow is more than this market can safely support. Try a smaller amount.")
    expect(out).not.toMatch(/spoke|insolvent/i)
  })

  it("maps wallet-insolvency removal to a risk message", () => {
    const out = humanizeBlockedReason("Removing collateral would make wallet wallet-1 insolvent")
    expect(out).toBe("Removing this much collateral would put your position at risk. Lower the amount.")
    expect(out).not.toMatch(/wallet-1|insolvent/i)
  })

  it("maps spoke-insolvency removal without leaking internals", () => {
    const out = humanizeBlockedReason("Removing collateral would make spoke uni-v3-bluechip insolvent")
    expect(out).toBe("This removal is more than this market can safely support. Try a smaller amount.")
    expect(out).not.toMatch(/spoke|insolvent/i)
  })

  it("scrubs an unmapped message that still leaks a wallet id or spoke", () => {
    expect(humanizeBlockedReason("Wallet wallet-1 has no debt to liquidate")).not.toMatch(/wallet-1/i)
    expect(humanizeBlockedReason("Debt position d-1 does not belong to spoke uni-v3")).not.toMatch(/spoke/i)
  })

  it("scrubs a raw wallet address", () => {
    expect(humanizeBlockedReason("0xabc123def456 has no collateral in spoke x")).not.toMatch(/0xabc123def456/)
  })

  it("passes through already-friendly copy unchanged", () => {
    const friendly = "Enter an amount to continue."
    expect(humanizeBlockedReason(friendly)).toBe(friendly)
  })

  it("returns null for empty input", () => {
    expect(humanizeBlockedReason(null)).toBeNull()
    expect(humanizeBlockedReason(undefined)).toBeNull()
  })
})
