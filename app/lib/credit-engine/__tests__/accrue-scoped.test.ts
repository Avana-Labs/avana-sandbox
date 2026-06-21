import { describe, expect, it } from "vitest"
import { accrueBorrowSystemStateForWallet } from "@/app/lib/credit-engine/accrue"
import { makeExampleBorrowSystemState } from "./fixtures"

describe("scoped accrue", () => {
  it("accrues the acting wallet debt positions when time advances", () => {
    const state = makeExampleBorrowSystemState()
    const next = accrueBorrowSystemStateForWallet(state, "wallet-1", state.now + 86_400_000)

    expect(next.now).toBe(state.now + 86_400_000)
    expect(next.accounts["wallet-1"]?.debtPositions[0]?.debtIndexRay).toBeGreaterThan(
      state.accounts["wallet-1"]!.debtPositions[0]!.debtIndexRay,
    )
  })
})
