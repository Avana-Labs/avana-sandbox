import { describe, expect, it } from "vitest"
import { applyBorrowAction, parseFixed } from "@/app/lib/credit-engine"
import { applyBorrowStatePatch, createBorrowStatePatch } from "@/app/lib/credit-engine/patch"
import { EXAMPLE_UNI_MARKET_ID, EXAMPLE_UNI_USDC_ASSET_ID, makeExampleBorrowSystemState } from "./fixtures"

describe("borrow state patch", () => {
  it("returns changed keys only and preserves untouched account references", () => {
    const state = makeExampleBorrowSystemState()
    const action = {
      type: "borrow" as const,
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("100", 6),
    }

    const next = applyBorrowAction(state, action)
    const patch = createBorrowStatePatch(state, next)

    expect(patch.transactions).toBeDefined()
    expect(state.accounts["wallet-2"]).toStrictEqual(next.accounts["wallet-2"])
    expect(applyBorrowStatePatch(state, patch).transactions.length).toBe(next.transactions.length)
  })
})
