import { describe, expect, it } from "vitest"
import { buildMockLendSystemState, buildMockLendSystemStateWithSeedPosition } from "@/app/lib/lend-system/mock"
import { SandboxLendReadAdapter } from "@/app/lib/lend-system/sandbox-read-adapter"
import { SandboxLendTransactionAdapter } from "@/app/lib/lend-system/sandbox-transaction-adapter"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { buildMockMultiplySystemState } from "@/app/lib/multiply-system/mock"

describe("SandboxLendReadAdapter", () => {
  it("loads markets and wallet positions", async () => {
    const state = buildMockLendSystemStateWithSeedPosition("wallet-1")
    const adapter = new SandboxLendReadAdapter({ state })

    const markets = await adapter.readMarkets()
    const page = await adapter.readLendPage("wallet-1")
    const portfolio = await adapter.readPortfolioLend("wallet-1")

    expect(markets.length).toBeGreaterThan(10)
    expect(page.featuredSnapshots.length).toBe(3)
    expect(page.marketRows.length).toBeGreaterThan(10)
    expect(portfolio.investments.length).toBe(1)
  })

  it("surfaces non-zero rewards APY for boosted lend markets", async () => {
    const state = buildMockLendSystemState("wallet-1")
    const adapter = new SandboxLendReadAdapter({ state })

    const page = await adapter.readLendPage("wallet-1")
    const boosted = page.marketRows.find((row) => row.asset === "USDG")

    expect(boosted?.rewardsApy).toBeGreaterThan(0)
    expect(boosted?.rewardsApyLabel).not.toBe("0.00%")
  })
})

describe("SandboxLendTransactionAdapter", () => {
  it("simulates deposit and withdraw without touching borrow or multiply state", async () => {
    const borrowBefore = buildMockBorrowSystemState("wallet-1")
    const multiplyBefore = buildMockMultiplySystemState("wallet-1")
    let state = buildMockLendSystemState("wallet-1")

    const adapter = new SandboxLendTransactionAdapter({
      readState: () => state,
      writeState: (next) => {
        state = next
      },
      now: () => state.now,
      generateId: (prefix) => `${prefix}-test`,
    })

    const depositIntent = adapter.createIntent({
      type: "deposit",
      walletId: "wallet-1",
      marketId: "eth",
      depositAmount: 100,
      walletBalance: 1000,
    })
    const depositResult = await adapter.executeTransaction(depositIntent)

    expect(depositResult.historyItem.kind).toBe("deposit")
    expect(Object.keys(depositResult.state.positions).length).toBe(1)

    const positionId = Object.keys(depositResult.state.positions)[0]!
    const withdrawIntent = adapter.createIntent({
      type: "withdraw",
      walletId: "wallet-1",
      marketId: "eth",
      positionId,
      withdrawAmount: 50,
    })
    const withdrawResult = await adapter.executeTransaction(withdrawIntent)

    expect(withdrawResult.historyItem.kind).toBe("withdraw")
    expect(withdrawResult.state.transactions.length).toBe(2)
    expect(buildMockBorrowSystemState("wallet-1").positions).toEqual(borrowBefore.positions)
    expect(buildMockMultiplySystemState("wallet-1").positions).toEqual(multiplyBefore.positions)
  })

  it("claims wallet-level lend rewards through the transaction adapter", async () => {
    let state = buildMockLendSystemStateWithSeedPosition("wallet-1")
    state.positions["wallet-1:eth"] = {
      ...state.positions["wallet-1:eth"]!,
      rewardsEarnedUsd: 88,
    }

    const adapter = new SandboxLendTransactionAdapter({
      readState: () => state,
      writeState: (next) => {
        state = next
      },
      now: () => state.now,
      generateId: (prefix) => `${prefix}-claim`,
    })

    const intent = adapter.createIntent({
      type: "claim",
      walletId: "wallet-1",
    })

    const preview = await adapter.previewTransaction(intent)
    expect(preview.allowed).toBe(true)
    expect(preview.before.rewardsEarnedUsd).toBe(88)
    expect(preview.after.rewardsEarnedUsd).toBe(0)

    const result = await adapter.executeTransaction(intent)

    expect(result.historyItem.kind).toBe("claim")
    expect(result.state.positions["wallet-1:eth"]?.rewardsEarnedUsd).toBe(0)
  })

  it("blocks redepositing funds that were already supplied from the wallet balance", async () => {
    let state = buildMockLendSystemState("wallet-1")
    state.walletBalances["wallet-1"] = { ...(state.walletBalances["wallet-1"] ?? {}), eth: 1.28 }
    let nextId = 0

    const adapter = new SandboxLendTransactionAdapter({
      readState: () => state,
      writeState: (next) => {
        state = next
      },
      now: () => state.now,
      generateId: (prefix) => `${prefix}-wallet-${nextId++}`,
    })

    const firstDeposit = adapter.createIntent({
      type: "deposit",
      walletId: "wallet-1",
      marketId: "eth",
      depositAmount: 1,
      walletBalance: state.walletBalances["wallet-1"]!.eth,
    })
    await adapter.executeTransaction(firstDeposit)

    const secondDeposit = adapter.createIntent({
      type: "deposit",
      walletId: "wallet-1",
      marketId: "eth",
      depositAmount: 0.5,
      walletBalance: state.walletBalances["wallet-1"]!.eth,
    })
    const preview = await adapter.previewTransaction(secondDeposit)

    expect(state.walletBalances["wallet-1"]!.eth).toBeCloseTo(0.28, 6)
    expect(preview.allowed).toBe(false)
    expect(preview.validationErrors[0]).toContain("Insufficient wallet balance")
  })
})
