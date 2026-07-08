import { describe, expect, it } from "vitest"
import { blockedCtaLabel } from "@/app/lib/action-system/blocked-ui"

describe("blockedCtaLabel", () => {
  it("names the asset on insufficient-balance blocks", () => {
    expect(blockedCtaLabel("Insufficient wallet balance.", { symbol: "USDC" })).toEqual({
      label: "Insufficient USDC",
    })
    expect(blockedCtaLabel("You don't have enough balance to repay this amount.", { symbol: "ETH" })).toEqual({
      label: "Insufficient ETH",
    })
    // Without a symbol it falls back to a generic balance label.
    expect(blockedCtaLabel("Insufficient balance").label).toBe("Insufficient balance")
  })

  it("flags the no-collateral block as a redirect", () => {
    expect(blockedCtaLabel("You have no collateral in this market yet.")).toEqual({
      label: "Deposit collateral first",
      redirect: true,
    })
    expect(blockedCtaLabel("Deposit collateral before borrowing")).toEqual({
      label: "Deposit collateral first",
      redirect: true,
    })
  })

  it("maps liquidity, borrowing power, and market-state blocks to short labels", () => {
    expect(blockedCtaLabel("There isn't enough liquidity for this amount right now.").label).toBe(
      "Insufficient liquidity",
    )
    expect(blockedCtaLabel("You don't have enough borrowing power for this amount.").label).toBe(
      "Try a smaller amount",
    )
    expect(blockedCtaLabel("Borrowing unavailable").label).toBe("Borrowing unavailable")
    expect(blockedCtaLabel("Market is paused.").label).toBe("Market paused")
    expect(blockedCtaLabel("Deposit would exceed the market supply cap.").label).toBe("Supply cap reached")
    expect(blockedCtaLabel("You don't have enough LP in your wallet for this deposit.").label).toBe(
      "Insufficient LP",
    )
  })

  it("handles claim and empty-amount reasons", () => {
    expect(blockedCtaLabel("Nothing to claim").label).toBe("Nothing to claim")
    expect(blockedCtaLabel("Select rewards to claim").label).toBe("Select rewards")
    expect(blockedCtaLabel("Amount must be positive.").label).toBe("Enter an amount")
  })

  it("only redirects for the no-collateral case", () => {
    expect(blockedCtaLabel("Insufficient wallet balance.").redirect).toBeUndefined()
    expect(blockedCtaLabel("Borrowing unavailable").redirect).toBeUndefined()
  })
})
