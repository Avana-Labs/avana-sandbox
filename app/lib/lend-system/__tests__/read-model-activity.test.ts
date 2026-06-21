import { describe, expect, it } from "vitest"
import { buildPortfolioLendData } from "@/app/lib/lend-system/read-model"
import { buildMockLendSystemStateWithSeedPosition } from "@/app/lib/lend-system/mock"
import type { LendTransactionHistoryItem } from "@/app/lib/lend-system/contracts"

describe("buildPortfolioLendData", () => {
  it("maps lend activity into usd amounts for dashboard history", () => {
    const state = buildMockLendSystemStateWithSeedPosition("wallet-1")
    const market = state.markets.eth!
    const history: LendTransactionHistoryItem[] = [
      {
        id: "tx-1",
        intentId: "intent-1",
        walletId: "wallet-1",
        marketId: market.marketId,
        positionId: "wallet-1:eth",
        kind: "deposit",
        status: "success",
        asset: market.asset.symbol,
        amount: 2,
        simulated: true,
        timestamp: state.now,
        hash: "0xdeposit",
      },
      {
        id: "tx-2",
        intentId: "intent-2",
        walletId: "wallet-1",
        marketId: market.marketId,
        positionId: "wallet-1:eth",
        kind: "withdraw",
        status: "success",
        asset: market.asset.symbol,
        amount: 0.5,
        simulated: true,
        timestamp: state.now + 60_000,
        hash: "0xwithdraw",
      },
    ]

    const portfolio = buildPortfolioLendData("wallet-1", state, history)

    expect(portfolio.history).toHaveLength(2)
    expect(portfolio.history[0]?.amountUsd).toBeCloseTo(2 * market.assetPriceUsd, 6)
    expect(portfolio.history[1]?.amountUsd).toBeCloseTo(0.5 * market.assetPriceUsd, 6)
  })
})
