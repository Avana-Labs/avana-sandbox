import { describe, expect, it } from "vitest"
import { calculateHealthFactorWad, formatFixed, parseFixed } from "@/app/lib/credit-engine"
import { applyBorrowAction } from "@/app/lib/credit-engine/actions"
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
    expect(snapshot.spokeBreakdown).toHaveLength(2)
    expect(snapshot.spokeBreakdown.reduce((sum, row) => sum + row.totalBorrowedUsd, 0)).toBe(snapshot.totalBorrowedUsd)
    expect(supplies.find((row) => row.pool.id === "uni-v3-bluechip-wbtc-weth")?.borrowedUsd).toBe(0)
    expect(supplies.find((row) => row.pool.id === "uni-v3-bluechip-weth-usdc")?.borrowedUsd).toBe(1200)
  })

  it("reflects shared-session borrow activity in debt and collateral rows", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const next = applyBorrowAction(state, {
      type: "borrow",
      walletId: "demo-wallet",
      marketId: "uni-v3-bluechip-weth-usdc",
      assetId: "uni-v3-bluechip:usdc",
      amountUsd6: parseFixed("300", 6),
    })

    const supplies = selectPortfolioSupplyRows(next, "demo-wallet")
    const debts = selectPortfolioDebtRows(next, "demo-wallet")

    expect(supplies.find((row) => row.pool.id === "uni-v3-bluechip-weth-usdc")?.borrowedUsd).toBeGreaterThan(1200)
    expect(debts.find((row) => row.pool.id === "uni-v3-bluechip-weth-usdc")?.borrowedUsd).toBeGreaterThan(1200)
    expect(debts.some((row) => row.id.includes("uni-v3-bluechip:usdc"))).toBe(true)
  })

  it("keeps wallet-wide totals while exposing the spoke that changed", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const next = applyBorrowAction(state, {
      type: "borrow",
      walletId: "demo-wallet",
      marketId: "uni-v3-bluechip-weth-usdc",
      assetId: "uni-v3-bluechip:usdc",
      amountUsd6: parseFixed("150", 6),
    })

    const snapshot = selectBorrowSnapshot(next, "demo-wallet")
    const bluechip = snapshot.spokeBreakdown.find((row) => row.spokeId === "uni-v3-bluechip")
    const stable = snapshot.spokeBreakdown.find((row) => row.spokeId === "uni-v3-stable")

    expect(snapshot.totalBorrowedUsd).toBe(2150)
    expect(bluechip?.totalBorrowedUsd).toBe(1350)
    expect(stable?.totalBorrowedUsd).toBe(800)
  })

  it("uses spoke-level engine health factors for portfolio rows", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const supplies = selectPortfolioSupplyRows(state, "demo-wallet")
    const debts = selectPortfolioDebtRows(state, "demo-wallet")
    const bluechipMarketId = "uni-v3-bluechip-weth-usdc"
    const expectedHealthFactor = Number.parseFloat(
      formatFixed(calculateHealthFactorWad(state, "demo-wallet", "uni-v3-bluechip")!, 18),
    )

    expect(supplies.find((row) => row.pool.id === bluechipMarketId)?.healthFactor).toBeCloseTo(expectedHealthFactor, 2)
    expect(debts.find((row) => row.pool.id === bluechipMarketId)?.healthFactor).toBeCloseTo(expectedHealthFactor, 2)
  })
})
