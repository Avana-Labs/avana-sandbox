import { describe, expect, it } from "vitest"
import { getDefaultWalletProfileId } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { SandboxBorrowReadAdapter } from "@/app/lib/borrow-system/sandbox-read-adapter"
import { ProductionBorrowReadAdapter } from "@/app/lib/borrow-system/production-read-adapter"
import { selectBorrowMarketSummaries } from "@/app/lib/borrow-system/selectors"

describe("borrow read adapters", () => {
  it("reads borrow page, portfolio borrow, wallet snapshot, and detail records from one sandbox contract", async () => {
    const walletId = getDefaultWalletProfileId()
    const state = buildMockBorrowSystemState(walletId)
    const adapter = new SandboxBorrowReadAdapter({ state })

    const [walletSnapshot, markets, borrowPage, portfolioBorrow, poolDetail, assetDetail] = await Promise.all([
      adapter.readWalletSnapshot(walletId),
      adapter.readMarkets(),
      adapter.readBorrowPage(walletId),
      adapter.readPortfolioBorrow(walletId),
      adapter.readPoolDetail("eth-usdc"),
      adapter.readAssetDetail("uni-v3-stable:usdc"),
    ])

    expect(walletSnapshot.walletId).toBe(walletId)
    expect(walletSnapshot.creditSnapshot.collateralValueUsd6).toBeGreaterThan(0n)
    expect(walletSnapshot.transactionHistory).toHaveLength(state.transactions.length)
    expect(walletSnapshot.transactionHistory.every((item) => item.simulated)).toBe(true)

    expect(markets).toHaveLength(Object.keys(state.markets).length)
    expect(borrowPage.walletId).toBe(walletId)
    expect(borrowPage.poolCatalog).toEqual(selectBorrowMarketSummaries(state, walletId))
    expect(borrowPage.explore.trendingCollateral).toHaveLength(3)
    expect(borrowPage.explore.topMarkets).toHaveLength(3)
    expect(borrowPage.explore.highApyPools).toHaveLength(3)

    expect(portfolioBorrow.creditLines.totalCollateralUsd).toBeGreaterThan(0)
    expect(portfolioBorrow.collateralPositions.length).toBeGreaterThan(0)
    expect(portfolioBorrow.debtPositions.length).toBeGreaterThan(0)

    expect(poolDetail?.hero.name).toBe("WETH / USDC")
    expect(assetDetail?.hero.symbol).toBe("USDC")
  })

  it("exposes a production placeholder that matches the read contract and throws intentionally", async () => {
    const adapter = new ProductionBorrowReadAdapter()

    await expect(adapter.readWalletSnapshot("wallet-1")).rejects.toThrow("Production read adapter is not implemented")
    await expect(adapter.readMarkets()).rejects.toThrow("Production read adapter is not implemented")
    await expect(adapter.readBorrowPage("wallet-1")).rejects.toThrow("Production read adapter is not implemented")
    await expect(adapter.readPortfolioBorrow("wallet-1")).rejects.toThrow("Production read adapter is not implemented")
    await expect(adapter.readPoolDetail("pool-1")).rejects.toThrow("Production read adapter is not implemented")
    await expect(adapter.readAssetDetail("asset-1")).rejects.toThrow("Production read adapter is not implemented")
  })
})
