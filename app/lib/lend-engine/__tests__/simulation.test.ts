import { describe, expect, it } from "vitest"
import { applyLendAction } from "@/app/lib/lend-engine/actions"
import { simulateDeposit, simulateWithdraw } from "@/app/lib/lend-engine/simulation"
import { validateDepositAction, validateWithdrawAction } from "@/app/lib/lend-engine/validation"
import { buildMockLendMarket } from "@/app/lib/lend-system/mock"

describe("lend engine simulation and validation", () => {
  const market = buildMockLendMarket("eth")

  it("simulates deposit with before/after metrics", () => {
    const simulation = simulateDeposit({ market, depositAmount: 1000, walletBalance: 5000, now: market.lastAccrualTimestamp })

    expect(simulation.before.suppliedAmount).toBe(0)
    expect(simulation.after.suppliedAmount).toBe(1000)
    expect(simulation.after.principalAmount).toBe(1000)
    expect(simulation.marketAfter.totalSupplied).toBe(market.totalSupplied + 1000)
    expect(simulation.validation.allowed).toBe(true)
  })

  it("blocks invalid deposits", () => {
    const validation = validateDepositAction({
      depositAmount: 0,
      market,
      assetSupported: true,
    })
    expect(validation.allowed).toBe(false)
    expect(validation.errors[0]).toContain("positive")
  })

  it("simulates withdraw with principal/interest split", () => {
    const deposited = applyLendAction(
      { now: market.lastAccrualTimestamp, markets: { [market.marketId]: market }, positions: {}, transactions: [] },
      { type: "deposit", walletId: "wallet-1", marketId: market.marketId, depositAmount: 1000, walletBalance: 5000 },
      { positionId: "pos-1", transactionId: "tx-1" },
    )
    const position = Object.values(deposited.positions)[0]!
    const updatedMarket = deposited.markets[market.marketId]!

    const simulation = simulateWithdraw({
      market: updatedMarket,
      position,
      withdrawAmount: 500,
      now: updatedMarket.lastAccrualTimestamp,
    })

    expect(simulation.withdrawal.maxWithdrawable).toBeGreaterThan(0)
    expect(simulation.withdrawal.principalWithdrawn + simulation.withdrawal.interestWithdrawn).toBeCloseTo(500)
    expect(simulation.validation.allowed).toBe(true)
  })

  it("blocks withdraw above available liquidity", () => {
    const position = {
      positionId: "pos-1",
      walletId: "wallet-1",
      marketId: market.marketId,
      asset: "ETH",
      principalAmount: 1000,
      scaledBalance: 1000,
      liquidityIndexAtLastAction: 1,
      currentSuppliedAmount: 1000,
      interestEarned: 0,
      suppliedValueUsd: 3_500_000,
      openedAt: market.lastAccrualTimestamp,
      updatedAt: market.lastAccrualTimestamp,
      status: "active" as const,
    }

    const validation = validateWithdrawAction({
      withdrawAmount: market.availableLiquidity + 1,
      market,
      position,
      currentSuppliedBalance: 1000,
      maxWithdrawable: market.availableLiquidity,
    })

    expect(validation.allowed).toBe(false)
  })
})
