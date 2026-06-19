import { describe, expect, it } from "vitest"
import { calculateCreditMetrics, formatFixed, parseFixed } from "@/app/lib/credit-engine"
import { applyBorrowAction } from "@/app/lib/credit-engine/actions"
import { makeExampleBorrowSystemState } from "./fixtures"

describe("borrow debt actions", () => {
  it("adds debt and reduces liquidity on borrow", () => {
    const state = makeExampleBorrowSystemState()
    const next = applyBorrowAction(state, {
      type: "borrow",
      walletId: "wallet-1",
      marketId: "uni-v3-bluechip-weth-usdc",
      assetId: "usdc",
      amountUsd6: parseFixed("1200", 6),
    })

    expect(formatFixed(next.assets.usdc.snapshot.availableLiquidityUsd6, 6)).toBe("124998800")
    expect(formatFixed(next.assets.usdc.snapshot.totalBorrowedUsd6, 6)).toBe("54001200")
    expect(formatFixed(calculateCreditMetrics(next, "wallet-1").totalBorrowedUsd6, 6)).toBe("7400")
    expect(next.transactions.at(-1)?.kind).toBe("borrow")
  })

  it("burns debt and restores liquidity on repay", () => {
    const state = makeExampleBorrowSystemState()
    const next = applyBorrowAction(state, {
      type: "repay",
      walletId: "wallet-1",
      debtPositionId: "wallet-1:usdc",
      amountUsd6: parseFixed("1000", 6),
    })

    expect(formatFixed(next.assets.usdc.snapshot.availableLiquidityUsd6, 6)).toBe("125001000")
    expect(formatFixed(next.assets.usdc.snapshot.totalBorrowedUsd6, 6)).toBe("53999000")
    expect(formatFixed(calculateCreditMetrics(next, "wallet-1").totalBorrowedUsd6, 6)).toBe("5200")
    expect(next.transactions.at(-1)?.kind).toBe("repay")
  })
})
