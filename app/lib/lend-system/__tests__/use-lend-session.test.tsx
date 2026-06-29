import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { buildLendSessionSeed } from "@/app/lib/lend-system/demo-session"
import { writeLendSessionState } from "@/app/lib/lend-system/storage"
import { buildMockLendSystemStateWithSeedPosition } from "@/app/lib/lend-system/mock"
import { ProductionLendReadAdapter } from "@/app/lib/lend-system/production-read-adapter"
import { ProductionLendTransactionAdapter } from "@/app/lib/lend-system/production-transaction-adapter"
import { deserializeLendSystemState } from "@/app/lib/lend-system/codec"
import { useLendSession } from "@/app/lib/lend-system/use-lend-session"

describe("useLendSession", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("hydrates persisted lend state and executes a simulated deposit", async () => {
    const walletId = "demo-wallet"
    const seededState = buildMockLendSystemStateWithSeedPosition(walletId)
    seededState.walletBalances[walletId] = {
      ...(seededState.walletBalances[walletId] ?? {}),
      gho: 5_000,
    }
    const sessionSeed = buildLendSessionSeed(walletId)

    writeLendSessionState(walletId, seededState)

    const { result } = renderHook(() =>
      useLendSession({
        walletId,
        sessionSeed,
      }),
    )

    expect(Object.keys(result.current.state.positions).length).toBeGreaterThan(0)

    await act(async () => {
      const intent = result.current.createIntent({
        type: "deposit",
        walletId,
        marketId: "gho",
        depositAmount: 500,
        walletBalance: 5000,
      })
      const preview = await result.current.previewTransaction(intent)
      expect(preview.allowed).toBe(true)
      await result.current.executeTransaction(intent)
    })

    expect(result.current.transactionHistory.length).toBeGreaterThan(0)
  })

  it("updates wallet balances after deposit and withdraw", async () => {
    const walletId = "demo-wallet"
    const seededState = buildMockLendSystemStateWithSeedPosition(walletId)
    const sessionSeed = buildLendSessionSeed(walletId)

    writeLendSessionState(walletId, seededState)

    const { result } = renderHook(() =>
      useLendSession({
        walletId,
        sessionSeed,
      }),
    )

    const beforeBalance = result.current.state.walletBalances[walletId]?.eth ?? 0

    await act(async () => {
      const depositIntent = result.current.createIntent({
        type: "deposit",
        walletId,
        marketId: "eth",
        depositAmount: 1,
        walletBalance: beforeBalance,
      })
      await result.current.executeTransaction(depositIntent)
    })

    expect(result.current.state.walletBalances[walletId]?.eth).toBeCloseTo(beforeBalance - 1, 6)

    const positionId = Object.keys(result.current.state.positions).find((id) => id.includes(":eth"))!

    await act(async () => {
      const withdrawIntent = result.current.createIntent({
        type: "withdraw",
        walletId,
        marketId: "eth",
        positionId,
        withdrawAmount: 0.5,
      })
      await result.current.executeTransaction(withdrawIntent)
    })

    expect(result.current.state.walletBalances[walletId]?.eth).toBeCloseTo(beforeBalance - 0.5, 6)
  })

  it("disables sandbox persistence automatically for injected production adapters", async () => {
    const walletId = "demo-wallet"
    const state = buildMockLendSystemStateWithSeedPosition(walletId)
    const sessionSeed = buildLendSessionSeed(walletId)
    const readAdapter = new ProductionLendReadAdapter({
      readMarkets: async () => Object.values(state.markets),
      readLendPage: async () => ({}) as never,
      readPortfolioLend: async () => ({}) as never,
      readWalletSnapshot: async () => ({}) as never,
    })
    const preview = {
      intent: {
        id: "intent-live",
        actionType: "claim" as const,
        walletId,
        marketId: "rewards",
        requestedAt: 123,
        simulated: false,
        payload: {
          type: "claim" as const,
          walletId,
        },
      },
      allowed: true,
      warnings: [],
      validationErrors: [],
      before: {
        suppliedAmount: 10,
        suppliedValueUsd: 100,
        principalAmount: 9,
        interestEarned: 1,
        rewardsEarnedUsd: 12,
        totalEarnedUsd: 13,
        currentApy: 0.08,
      },
      after: {
        suppliedAmount: 10,
        suppliedValueUsd: 100,
        principalAmount: 9,
        interestEarned: 1,
        rewardsEarnedUsd: 0,
        totalEarnedUsd: 1,
        currentApy: 0.08,
      },
    }
    const transactionAdapter = new ProductionLendTransactionAdapter({
      now: () => 123,
      generateId: () => "intent-live",
      previewTransaction: async () => preview,
      executeTransaction: async () => ({
        preview,
        receipt: {
          id: "tx-live",
          hash: "0xlive",
          status: "success",
          actionType: "claim",
          simulated: false,
          timestamp: 456,
        },
        historyItem: {
          id: "tx-live",
          intentId: "intent-live",
          walletId,
          marketId: "rewards",
          kind: "claim",
          status: "success",
          asset: "Rewards",
          amount: 12,
          simulated: false,
          timestamp: 456,
          hash: "0xlive",
        },
        state: {
          ...state,
          now: 456,
        },
      }),
    })

    const { result } = renderHook(() =>
      useLendSession({
        walletId,
        sessionSeed,
        readAdapter,
        transactionAdapter,
      }),
    )

    expect(result.current.readAdapter).toBe(readAdapter)
    expect(window.localStorage.length).toBe(0)

    await act(async () => {
      const intent = result.current.createIntent({
        type: "claim",
        walletId,
      })
      expect(intent.simulated).toBe(false)
      await result.current.executeTransaction(intent)
    })

    expect(result.current.transactionHistory[0]?.kind).toBe("claim")
    expect(result.current.state.now).toBe(456)
    expect(window.localStorage.length).toBe(0)
  })

  it("hydrates legacy lend state that is missing wallet balances", () => {
    const legacy = JSON.stringify({
      now: 123,
      markets: {},
      positions: {},
      transactions: [],
    })

    expect(deserializeLendSystemState(legacy)).toEqual({
      now: 123,
      markets: {},
      positions: {},
      walletBalances: {},
      transactions: [],
    })
  })
})
