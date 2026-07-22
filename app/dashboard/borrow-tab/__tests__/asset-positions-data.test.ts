import { describe, expect, it } from "vitest"
import {
  getDashboardCollateralData,
  getDashboardDebtData,
  getDashboardTradingFeesData,
} from "@/app/dashboard/borrow-tab/asset-positions-data"

describe("dashboard borrow asset-position fixtures", () => {
  it("p0-03: never returns DEV fixture collateral/debt amounts (ETH $5.80 / cbBTC $0.64)", () => {
    const collateral = getDashboardCollateralData()
    const debt = getDashboardDebtData()
    const fees = getDashboardTradingFeesData()

    expect(collateral.rows).toEqual([])
    expect(debt.rows).toEqual([])
    expect(fees.rows).toEqual([])
    expect(collateral.summary.depositedUsd).toBe(0)
    expect(debt.summary.borrowedUsd).toBe(0)
    expect(JSON.stringify({ collateral, debt, fees })).not.toMatch(/5\.8|0\.64/)
  })
})
