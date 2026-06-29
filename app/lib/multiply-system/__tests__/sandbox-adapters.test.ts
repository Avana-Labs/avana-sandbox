import { describe, expect, it } from "vitest"
import { makeExampleBorrowSystemState } from "@/app/lib/credit-engine/__tests__/fixtures"
import { makeExampleMultiplySystemState } from "@/app/lib/multiply-engine/__tests__/fixtures"
import { SandboxMultiplyReadAdapter } from "@/app/lib/multiply-system/sandbox-read-adapter"
import { SandboxMultiplyTransactionAdapter } from "@/app/lib/multiply-system/sandbox-transaction-adapter"

describe("SandboxMultiplyReadAdapter", () => {
  it("loads 20 markets and wallet-specific positions", async () => {
    const state = makeExampleMultiplySystemState()
    const adapter = new SandboxMultiplyReadAdapter({ state })

    const markets = await adapter.readMarkets()
    expect(markets).toHaveLength(20)

    const portfolio = await adapter.readPortfolioMultiply("wallet-1")
    expect(portfolio.positions.length).toBeGreaterThan(0)

    const page = await adapter.readMultiplyPage("wallet-1")
    expect(page.lendRows).toHaveLength(20)
    expect(page.trendingSnapshots).toHaveLength(4)
  })

  it("exposes wallet risk snapshots from open positions", async () => {
    const state = makeExampleMultiplySystemState()
    const adapter = new SandboxMultiplyReadAdapter({ state })
    const snapshot = await adapter.readWalletSnapshot("wallet-1")
    expect(snapshot.riskSnapshots.length).toBeGreaterThan(0)
  })
})

describe("SandboxMultiplyTransactionAdapter", () => {
  it("rejects multiply intents that would open below the liquidation threshold", async () => {
    let multiplyState = makeExampleMultiplySystemState()
    multiplyState = {
      ...multiplyState,
      markets: {
        ...multiplyState.markets,
        "eth-usdt": {
          ...multiplyState.markets["eth-usdt"]!,
          risk: {
            ...multiplyState.markets["eth-usdt"]!.risk,
            maxLtv: 0.95,
            publicMaxMultiplier: 10,
            hardMaxMultiplier: 10,
          },
        },
      },
    }
    const adapter = new SandboxMultiplyTransactionAdapter({
      readState: () => multiplyState,
      writeState: (nextState) => {
        multiplyState = nextState
      },
      now: () => 1_718_800_000_000,
      generateId: (() => {
        let count = 0
        return (prefix: string) => `${prefix}-${++count}`
      })(),
    })

    const dangerousIntent = adapter.createIntent({
      type: "multiply",
      walletId: "wallet-2",
      marketId: "eth-usdt",
      collateralAmount: 0.5,
      selectedMultiplier: 7,
    })

    const preview = await adapter.previewTransaction(dangerousIntent)
    const result = await adapter.executeTransaction(dangerousIntent)

    expect(preview.allowed).toBe(false)
    expect(preview.validationErrors.join(" ")).toContain("liquidation threshold")
    expect(result.receipt.status).toBe("failed")
    expect(result.state).toEqual(multiplyState)
    expect(multiplyState.transactions).toHaveLength(0)
  })

  it("simulates multiply and deleverage without touching borrow state", async () => {
    const borrowState = makeExampleBorrowSystemState()
    let multiplyState = makeExampleMultiplySystemState()
    const position = Object.values(multiplyState.positions)[0]!

    const adapter = new SandboxMultiplyTransactionAdapter({
      readState: () => multiplyState,
      writeState: (nextState) => {
        multiplyState = nextState
      },
      now: () => 1_718_800_000_000,
      generateId: (() => {
        let count = 0
        return (prefix: string) => `${prefix}-${++count}`
      })(),
    })

    const multiplyIntent = adapter.createIntent({
      type: "multiply",
      walletId: "wallet-2",
      marketId: "eth-usdt",
      collateralAmount: 0.5,
      selectedMultiplier: 2,
    })
    const multiplyResult = await adapter.executeTransaction(multiplyIntent)
    expect(multiplyResult.receipt.simulated).toBe(true)
    expect(multiplyResult.receipt.status).toBe("success")
    expect(multiplyResult.preview.before.netApy).not.toBeCloseTo(multiplyResult.preview.after.netApy, 6)

    const deleverageIntent = adapter.createIntent({
      type: "deleverage",
      walletId: position.walletId,
      positionId: position.id,
      targetMultiplier: 1.8,
    })
    const deleverageResult = await adapter.executeTransaction(deleverageIntent)
    expect(deleverageResult.receipt.status).toBe("success")
    expect(deleverageResult.preview.after.debtValueUsd).toBeLessThan(deleverageResult.preview.before.debtValueUsd)

    expect(borrowState.accounts["wallet-1"]?.debtPositions.length).toBeGreaterThan(0)
    expect(Object.keys(multiplyState.positions).length).toBeGreaterThan(0)
  })

  it("keeps repeated multiply actions additive in state and portfolio reads", async () => {
    let multiplyState = makeExampleMultiplySystemState()
    const existing = multiplyState.positions["wallet-1:eth-usdt"]!
    const initialLiquidity = multiplyState.markets[existing.marketId]!.economics.availableLiquidityUsd
    const adapter = new SandboxMultiplyTransactionAdapter({
      readState: () => multiplyState,
      writeState: (nextState) => {
        multiplyState = nextState
      },
      now: () => 1_718_800_000_000,
      generateId: (() => {
        let count = 0
        return (prefix: string) => `${prefix}-${++count}`
      })(),
    })

    const intent = adapter.createIntent({
      type: "multiply",
      walletId: existing.walletId,
      marketId: existing.marketId,
      collateralAmount: 0.5,
      selectedMultiplier: 2,
    })
    const result = await adapter.executeTransaction(intent)
    const updated = multiplyState.positions[existing.id]!
    const readAdapter = new SandboxMultiplyReadAdapter({ state: multiplyState, transactionHistory: [result.historyItem] })
    const portfolio = await readAdapter.readPortfolioMultiply(existing.walletId)

    expect(updated.collateralValueUsd).toBeGreaterThan(existing.collateralValueUsd)
    expect(updated.debtValueUsd).toBeGreaterThan(existing.debtValueUsd)
    expect(result.historyItem.amountUsd).toBeCloseTo(result.preview.after.collateralValueUsd - result.preview.before.collateralValueUsd)
    expect(portfolio.creditLines.totalCollateralUsd).toBeCloseTo(updated.collateralValueUsd)
    expect(portfolio.creditLines.totalBorrowedUsd).toBeCloseTo(updated.debtValueUsd)
    expect(multiplyState.markets[existing.marketId]!.economics.availableLiquidityUsd).toBeCloseTo(
      initialLiquidity - (updated.debtValueUsd - existing.debtValueUsd),
    )
  })
})
