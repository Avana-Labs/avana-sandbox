import { describe, expect, it } from "vitest"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectBorrowSnapshot, selectPortfolioDebtRows, selectPortfolioSupplyRows } from "@/app/lib/borrow-system/dashboard-selectors"

describe("borrow dashboard selectors", () => {
  it("projects canonical borrow session state into dashboard row contexts", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const supplies = selectPortfolioSupplyRows(state, "demo-wallet")
    const debts = selectPortfolioDebtRows(state, "demo-wallet")
    const snapshot = selectBorrowSnapshot(state, "demo-wallet")

    expect(supplies).toHaveLength(3)
    expect(debts).toHaveLength(2)
    expect(snapshot.totalBorrowedUsd).toBe(2000)
    expect(snapshot.approvedUsd).toBeGreaterThan(0)
  })
})
