import { formatFixed, sharesToAssets, tokenAmountToUsd6 } from "@/app/lib/credit-engine"
import { serializeBorrowSystemState } from "@/app/lib/borrow-system/codec"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import {
  selectBorrowableAssets,
  selectBorrowCollateralPools,
  selectBorrowMarketSummaries,
  selectInitialBorrowDebts,
  selectWalletBorrowSnapshot,
} from "@/app/lib/borrow-system/selectors"
import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import {
  BORROW_DEXES,
  BORROW_PENDING_ROWS,
} from "@/app/lib/data/mock/shared/borrow"
import { getDefaultWalletProfileId } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import type { BorrowPageData } from "./types"

export type BorrowPageSource = {
  adapter: DataSourceAdapter
  getBorrowPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<BorrowPageData>>
}

export const mockBorrowPageAdapter = createDataSourceAdapter({
  id: "borrow-mock",
  label: "Borrow page mock source",
  mode: "mock",
})

export const liveBorrowPageAdapter = createDataSourceAdapter({
  id: "borrow-live",
  label: "Borrow page live source",
  mode: "live",
})

export const mockBorrowPageSource: BorrowPageSource = {
  adapter: mockBorrowPageAdapter,
  async getBorrowPageData() {
    const walletId = getDefaultWalletProfileId()
    const systemState = buildMockBorrowSystemState(walletId)
    const poolCatalog = selectBorrowMarketSummaries(systemState, walletId)
    const markets = Object.values(systemState.markets)
    const assets = Object.values(systemState.assets)

    const totalTvlUsd = markets.reduce((sum, market) => sum + Number.parseFloat(formatFixed(market.snapshot.totalLiquidityUsd6, 6)), 0)
    const totalCollateralUsd = markets.reduce((sum, market) => {
      const tokenAmount = sharesToAssets(market.snapshot.totalCollateralShares, market.snapshot.supplyIndexRay)
      return sum + Number.parseFloat(formatFixed(tokenAmountToUsd6(tokenAmount, market.snapshot.lpTokenPriceUsd6), 6))
    }, 0)
    const availableCreditUsd = markets.reduce((sum, market) => sum + Number.parseFloat(formatFixed(market.snapshot.availableUsd6, 6)), 0)
    const outstandingLoansUsd = assets.reduce((sum, asset) => sum + Number.parseFloat(formatFixed(asset.snapshot.totalBorrowedUsd6, 6)), 0)
    const totalTvlChangePct =
      totalTvlUsd > 0
        ? poolCatalog.reduce((sum, pool) => sum + (pool.change24hPct ?? 0) * pool.tvlUsd, 0) / totalTvlUsd
        : 0

    const poolsWithLogos = poolCatalog.filter((pool) => pool.visuals.every((visual) => Boolean(visual.iconUrl)))
    const averageApr = (pool: (typeof poolCatalog)[number]) => (pool.aprMin + pool.aprMax) / 2
    const byAvailableUsd = [...poolsWithLogos].sort((left, right) => right.availableUsd - left.availableUsd).slice(0, 3)
    const byTvlUsd = [...poolsWithLogos].sort((left, right) => right.tvlUsd - left.tvlUsd).slice(0, 3)
    const byApy = [...poolsWithLogos].sort((left, right) => averageApr(right) - averageApr(left)).slice(0, 3)

    return {
      fetchedAt: new Date().toISOString(),
      data: {
        walletId,
        borrowSessionSeed: serializeBorrowSystemState(systemState),
        poolCatalog,
        heroMetrics: {
          totalTvlUsd,
          totalCollateralUsd,
          availableCreditUsd,
          outstandingLoansUsd,
          totalTvlChangePct,
        },
        explore: {
          trendingCollateral: byAvailableUsd,
          topMarkets: byTvlUsd,
          highApyPools: byApy,
        },
        borrowableAssets: selectBorrowableAssets(systemState, walletId),
        pendingRows: BORROW_PENDING_ROWS,
        dexes: BORROW_DEXES,
        collateralPools: selectBorrowCollateralPools(systemState, walletId),
        initialDebts: selectInitialBorrowDebts(systemState, walletId),
        borrowSnapshot: selectWalletBorrowSnapshot(systemState, walletId),
      },
    }
  },
}

export const liveBorrowPageSource: BorrowPageSource = {
  adapter: liveBorrowPageAdapter,
  async getBorrowPageData() {
    throw createUnsupportedSourceError(liveBorrowPageAdapter, "getBorrowPageData")
  },
}
