import { describe, expect, it } from "vitest"
import { allocateDebtByCollateral, calculateLiveBorrowDebt } from "@/app/lib/data/providers/portfolio/live-accounting"

describe("live portfolio accounting", () => {
  it("derives accrued and daily Borrow interest from principal, index, and APR", () => {
    const debt = calculateLiveBorrowDebt({
      debtSharesUsd6: "1000000000",
      debtIndexRay: "1050000000000000000000000000",
      principalBorrowedUsd6: "1000000000",
      borrowRateWad: "73000000000000000",
    })

    expect(debt.borrowedUsd).toBe(1_050)
    expect(debt.borrowAprPct).toBe(7.3)
    expect(debt.accruedInterestUsd).toBe(50)
    expect(debt.dailyInterestUsd).toBeCloseTo(0.21, 8)
  })

  it("allocates shared debt proportionally without duplicating it", () => {
    const first = allocateDebtByCollateral(600, 750, 1_000)
    const second = allocateDebtByCollateral(600, 250, 1_000)
    expect(first).toBe(450)
    expect(second).toBe(150)
    expect(first + second).toBe(600)
  })
})
