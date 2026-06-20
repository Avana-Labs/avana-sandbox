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
})
