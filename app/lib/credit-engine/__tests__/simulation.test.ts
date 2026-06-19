import { describe, expect, it } from "vitest"
import { applyBorrowActions, assertBorrowSystemInvariants, calculateCreditMetrics, parseFixed } from "@/app/lib/credit-engine"
import { makeStressBorrowActions, makeStressBorrowSystemState } from "./stress-fixtures"

describe("borrow engine multi-user simulation", () => {
  it("keeps 1000 wallet interactions consistent across a large action batch", { timeout: 20_000 }, () => {
    const state = makeStressBorrowSystemState(1000)
    const actions = makeStressBorrowActions(state)
    const next = applyBorrowActions(state, actions)

    expect(Object.keys(next.accounts)).toHaveLength(1000)
    expect(next.transactions).toHaveLength(actions.length)
    assertBorrowSystemInvariants(next)

    for (const walletId of Object.keys(next.accounts)) {
      const metrics = calculateCreditMetrics(next, walletId)
      expect(metrics.poolCollateralValueUsd6).toBeGreaterThan(parseFixed("1000", 6))
      expect(metrics.totalBorrowedUsd6).toBeGreaterThanOrEqual(0n)
      expect(metrics.availableCreditUsd6).toBeGreaterThanOrEqual(0n)
      expect(metrics.healthFactorWad).toBeGreaterThan(parseFixed("1", 18))
    }
  })
})
