import { describe, expect, it } from "vitest"
import { applyBorrowActions, calculateCreditMetrics, parseFixed } from "@/app/lib/credit-engine"
import { makeExampleBorrowSystemState } from "./fixtures"

describe("borrow batch actions", () => {
  it("applies actions in chronological order across wallets", () => {
    const state = makeExampleBorrowSystemState()
    const next = applyBorrowActions(state, [
      {
        type: "repay",
        walletId: "wallet-1",
        debtPositionId: "wallet-1:usdc",
        amountUsd6: parseFixed("500", 6),
        at: state.now + 30_000,
      },
      {
        type: "borrow",
        walletId: "wallet-2",
        marketId: "curve-eth-usdt",
        assetId: "usdt",
        amountUsd6: parseFixed("800", 6),
        at: state.now + 15_000,
      },
      {
        type: "supplyCollateral",
        walletId: "wallet-2",
        marketId: "curve-eth-usdt",
        amountUsd6: parseFixed("1200", 6),
        at: state.now + 5_000,
      },
    ])

    expect(calculateCreditMetrics(next, "wallet-1").totalBorrowedUsd6).toBeGreaterThan(parseFixed("5700", 6))
    expect(calculateCreditMetrics(next, "wallet-1").totalBorrowedUsd6).toBeLessThan(parseFixed("5701", 6))
    expect(calculateCreditMetrics(next, "wallet-2").poolCollateralValueUsd6).toBeGreaterThan(parseFixed("1200", 6))
    expect(calculateCreditMetrics(next, "wallet-2").totalBorrowedUsd6).toBeGreaterThan(parseFixed("800", 6))
    expect(calculateCreditMetrics(next, "wallet-2").totalBorrowedUsd6).toBeLessThan(parseFixed("801", 6))
    expect(next.transactions.map((transaction) => transaction.kind)).toEqual(["deposit", "borrow", "repay"])
  })
})
