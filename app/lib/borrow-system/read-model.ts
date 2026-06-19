import {
  calculateBorrowCapacityUsd6,
  calculateCollateralValueUsd6,
  calculateCreditMetrics,
  calculateCurrentLtvWad,
  calculateHealthFactorWad,
  formatFixed,
  sharesToAssets,
  tokenAmountToUsd6,
  totalDebtValueUsd6,
  type BorrowSystemState,
} from "@/app/lib/credit-engine"
import { buildAssetDetail, resolveAsset } from "@/app/lib/borrow-detail/asset.mock"
import { buildPoolDetail } from "@/app/lib/borrow-detail/pool.mock"
import type { AssetDetail, PoolDetail } from "@/app/lib/borrow-detail/types"
import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import type { PortfolioBorrowTabData } from "@/app/lib/data/providers/portfolio"
import { HOME_POOL_TO_MARKET_ID } from "@/app/lib/borrow-system/mock"
import { listSpokeBorrowables } from "@/app/lib/borrow-system/registry"
import type { TransactionHistoryItem, TransactionMetricsSnapshot, WalletReadSnapshot } from "./contracts"
import { selectBorrowCollateralPools, selectBorrowMarketSummaries, selectBorrowableAssets, selectInitialBorrowDebts, selectWalletBorrowSnapshot } from "./selectors"
import { selectBorrowSnapshot, selectPortfolioDebtRows, selectPortfolioSupplyRows } from "./dashboard-selectors"
import { BORROW_DEXES, BORROW_PENDING_ROWS } from "@/app/lib/data/mock/shared/borrow"
import { serializeBorrowSystemState } from "./codec"

function fixedToNumber(value: bigint, decimals: number) {
  return Number.parseFloat(formatFixed(value, decimals))
}

function toMetricsSnapshot(state: BorrowSystemState, walletId: string): TransactionMetricsSnapshot {
  const metrics = calculateCreditMetrics(state, walletId)

  return {
    collateralValueUsd6: calculateCollateralValueUsd6(state, walletId),
    borrowCapacityUsd6: calculateBorrowCapacityUsd6(state, walletId),
    availableBorrowCapacityUsd6: metrics.availableCreditUsd6,
    totalBorrowedUsd6: metrics.totalBorrowedUsd6,
    currentLtvWad: calculateCurrentLtvWad(state, walletId),
    healthFactorWad: calculateHealthFactorWad(state, walletId),
  }
}

export function buildLegacyTransactionHistory(state: BorrowSystemState, walletId: string): TransactionHistoryItem[] {
  return state.transactions
    .filter((transaction) => transaction.walletId === walletId)
    .map((transaction) => ({
      id: transaction.id,
      intentId: `legacy-${transaction.id}`,
      walletId: transaction.walletId,
      marketId: transaction.marketId,
      assetId: transaction.assetId,
      kind: transaction.kind,
      status: "success",
      requestedAmountUsd6: transaction.amountUsd6,
      executedAmountUsd6: transaction.amountUsd6,
      simulated: true,
      timestamp: transaction.at,
      hash: `sim_${transaction.id}`,
    }))
}

export function buildSyntheticReceipts(history: TransactionHistoryItem[]) {
  return history.map((item) => ({
    id: item.id,
    hash: item.hash,
    status: item.status,
    actionType: item.kind,
    simulated: item.simulated,
    timestamp: item.timestamp,
  }))
}

export function buildWalletReadSnapshot(
  state: BorrowSystemState,
  walletId: string,
  transactionHistory: TransactionHistoryItem[] = buildLegacyTransactionHistory(state, walletId),
): WalletReadSnapshot {
  return {
    walletId,
    transactionHistory,
    creditSnapshot: toMetricsSnapshot(state, walletId),
  }
}

export function buildBorrowPageData(state: BorrowSystemState, walletId: string): BorrowPageData {
  const poolCatalog = selectBorrowMarketSummaries(state, walletId)
  const markets = Object.values(state.markets)
  const assets = Object.values(state.assets)

  const totalTvlUsd = markets.reduce((sum, market) => sum + fixedToNumber(market.snapshot.totalLiquidityUsd6, 6), 0)
  const totalCollateralUsd = markets.reduce((sum, market) => {
    const tokenAmount = sharesToAssets(market.snapshot.totalCollateralShares, market.snapshot.supplyIndexRay)
    return sum + fixedToNumber(tokenAmountToUsd6(tokenAmount, market.snapshot.lpTokenPriceUsd6), 6)
  }, 0)
  const availableCreditUsd = markets.reduce((sum, market) => sum + fixedToNumber(market.snapshot.availableUsd6, 6), 0)
  const outstandingLoansUsd = assets.reduce((sum, asset) => sum + fixedToNumber(asset.snapshot.totalBorrowedUsd6, 6), 0)
  const totalTvlChangePct =
    totalTvlUsd > 0
      ? poolCatalog.reduce((sum, pool) => sum + (pool.change24hPct ?? 0) * pool.tvlUsd, 0) / totalTvlUsd
      : 0

  const averageApr = (pool: (typeof poolCatalog)[number]) => (pool.aprMin + pool.aprMax) / 2

  return {
    walletId,
    borrowSessionSeed: serializeBorrowSystemState(state),
    poolCatalog,
    heroMetrics: {
      totalTvlUsd,
      totalCollateralUsd,
      availableCreditUsd,
      outstandingLoansUsd,
      totalTvlChangePct,
    },
    explore: {
      trendingCollateral: [...poolCatalog].sort((left, right) => right.availableUsd - left.availableUsd).slice(0, 3),
      topMarkets: [...poolCatalog].sort((left, right) => right.tvlUsd - left.tvlUsd).slice(0, 3),
      highApyPools: [...poolCatalog].sort((left, right) => averageApr(right) - averageApr(left)).slice(0, 3),
    },
    borrowableAssets: selectBorrowableAssets(state, walletId),
    pendingRows: BORROW_PENDING_ROWS,
    dexes: BORROW_DEXES,
    collateralPools: selectBorrowCollateralPools(state, walletId),
    initialDebts: selectInitialBorrowDebts(state, walletId),
    borrowSnapshot: selectWalletBorrowSnapshot(state, walletId),
  }
}

export function buildPortfolioBorrowData(state: BorrowSystemState, walletId: string): PortfolioBorrowTabData {
  const snapshot = selectBorrowSnapshot(state, walletId)
  const debtPositions = selectPortfolioDebtRows(state, walletId).map((position, index) => ({
    ...position,
    id: position.id ?? `${position.pool.id}:debt:${index}`,
  }))

  return {
    creditLines: {
      approvedUsd: snapshot.approvedUsd,
      liquidationThresholdUsd: snapshot.liquidationThresholdUsd,
      averageHealthFactor: snapshot.averageHealthFactor,
      currentLtvPct: snapshot.currentLtvPct,
      totalBorrowedUsd: snapshot.totalBorrowedUsd,
      totalCollateralUsd: snapshot.totalCollateralUsd,
    },
    collateralPositions: selectPortfolioSupplyRows(state, walletId),
    debtPositions,
  }
}

export function resolvePoolDetailFromState(state: BorrowSystemState, walletId: string, poolId: string): PoolDetail | null {
  const resolvedId = HOME_POOL_TO_MARKET_ID[poolId] ?? poolId
  const row = selectBorrowMarketSummaries(state, walletId).find((candidate) => candidate.id === resolvedId)
  if (!row) return null
  return buildPoolDetail(row)
}

export function resolveAssetDetailFromState(assetId: string): AssetDetail | null {
  const asset = listSpokeBorrowables().find((candidate) => candidate.id === assetId) ?? resolveAsset(assetId)
  if (!asset) return null
  return buildAssetDetail(asset)
}

export function readTotalBorrowedUsd(state: BorrowSystemState, walletId: string) {
  const account = state.accounts[walletId]
  if (!account) return 0
  return fixedToNumber(totalDebtValueUsd6(account), 6)
}
