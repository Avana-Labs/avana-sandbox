import {
  accrueBorrowSystemState,
  calculateBorrowCapacityUsd6,
  calculateCollateralValueUsd6,
  calculateCreditMetrics,
  calculateCurrentLtvWad,
  calculateHealthFactorWad,
  formatFixed,
  totalDebtValueUsd6,
  type BorrowSystemState,
} from "@/app/lib/credit-engine"
import { buildAssetDetail, resolveAsset } from "@/app/lib/borrow-detail/asset.mock"
import { buildPoolDetail } from "@/app/lib/borrow-detail/pool.mock"
import type { AssetDetail, PoolDetail } from "@/app/lib/borrow-detail/types"
import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import type { PortfolioBorrowTabData } from "@/app/lib/data/providers/portfolio"
import { formatBorrowLpSymbolLabel } from "@/app/lib/borrow-system/market-labels"
import { HOME_POOL_TO_MARKET_ID } from "@/app/lib/borrow-system/mock"
import { listSpokeBorrowables } from "@/app/lib/borrow-system/registry"
import type { TransactionHistoryItem, TransactionMetricsSnapshot, WalletReadSnapshot } from "./contracts"
import {
  selectBorrowCollateralPools,
  selectBorrowMarketSummaries,
  selectBorrowableAssets,
  selectInitialBorrowDebts,
  selectWalletBorrowSnapshot,
} from "./selectors"
import { selectBorrowSnapshot, selectPortfolioDebtRows, selectPortfolioSupplyRows } from "./dashboard-selectors"
import { BORROW_DEXES, BORROW_PENDING_ROWS } from "@/app/lib/data/catalog/borrow"
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

function historyKindToActivityKind(kind: TransactionHistoryItem["kind"]) {
  switch (kind) {
    case "deposit":
      return "pledge" as const
    case "withdraw":
      return "withdraw" as const
    case "borrow":
      return "borrow" as const
    case "repay":
      return "repay" as const
    case "claim":
      return "claim" as const
    case "liquidate":
      return "liquidation" as const
  }
}

const BORROW_KIND_LABEL: Record<TransactionHistoryItem["kind"], string> = {
  borrow: "Borrow",
  repay: "Repay",
  deposit: "Pledge",
  withdraw: "Withdraw",
  claim: "Claim",
  liquidate: "Liquidation",
}

type MarketDisplayLookup = Record<string, { display?: { visuals?: Array<{ symbol: string }>; name?: string } }>

export function mapTransactionHistoryToActivityRows(history: TransactionHistoryItem[], markets?: MarketDisplayLookup) {
  return history.map((item) => {
    const amountUsd = Number.parseFloat(formatFixed(item.executedAmountUsd6, 6))
    const signedAmount =
      item.kind === "borrow" || item.kind === "withdraw" || item.kind === "liquidate"
        ? -Math.abs(amountUsd)
        : Math.abs(amountUsd)

    // Prefer the market's friendly pair label (e.g. "WETH / USDC") over the raw
    // market id, falling back to a readable action label when the catalog is absent.
    const market = item.marketId && markets ? markets[item.marketId] : undefined
    const primaryLabel = market ? formatBorrowLpSymbolLabel(market) : (BORROW_KIND_LABEL[item.kind] ?? "Borrow")

    return {
      id: item.id,
      at: new Date(item.timestamp).toISOString(),
      product: "borrow" as const,
      kind: historyKindToActivityKind(item.kind),
      status:
        item.status === "success"
          ? ("confirmed" as const)
          : item.status === "failed"
            ? ("failed" as const)
            : ("pending" as const),
      amountUsd: signedAmount,
      primaryLabel,
      secondaryLabel: item.simulated ? "Simulated transaction" : "On-chain transaction",
      txHash: item.hash,
    }
  })
}

export function buildWalletReadSnapshot(
  state: BorrowSystemState,
  walletId: string,
  transactionHistory: TransactionHistoryItem[] = buildLegacyTransactionHistory(state, walletId),
  now: number = Date.now(),
): WalletReadSnapshot {
  // Advance debt/supply indexes to "now" so the displayed HF drifts with interest
  // between actions. accrueBorrowSystemState is immutable (returns a new state and
  // no-ops when now <= state.now), so we select from the accrued copy without
  // double-accruing or mutating the shared session state.
  const accrued = accrueBorrowSystemState(state, now)
  return {
    walletId,
    transactionHistory,
    creditSnapshot: toMetricsSnapshot(accrued, walletId),
  }
}

export function buildBorrowPageData(state: BorrowSystemState, walletId: string): BorrowPageData {
  // NOTE: the borrow markets/landing page shows market-reference figures (pool TVL,
  // example collateral) and re-emits the session seed, so it is intentionally NOT
  // accrued here — accruing would drift those reference numbers and bake an advanced
  // `now` into the serialized seed. The between-actions wallet HF that must stay live
  // is accrued in the portfolio/wallet-snapshot read paths (buildPortfolioBorrowData /
  // buildWalletReadSnapshot) instead.
  const poolCatalog = selectBorrowMarketSummaries(state, walletId)
  const markets = Object.values(state.markets)
  const assets = Object.values(state.assets)

  // Same contract as aggregateBorrowEconomyFromSnapshots — the borrow landing hero.
  const totalTvlUsd = markets.reduce((sum, market) => sum + fixedToNumber(market.snapshot.totalLiquidityUsd6, 6), 0)
  const totalCollateralUsd = totalTvlUsd
  const availableCreditUsd = markets.reduce((sum, market) => sum + fixedToNumber(market.snapshot.availableUsd6, 6), 0)
  const outstandingLoansUsd = assets.reduce((sum, asset) => sum + fixedToNumber(asset.snapshot.totalBorrowedUsd6, 6), 0)
  const totalTvlChangePct =
    totalTvlUsd > 0
      ? poolCatalog.reduce((sum, pool) => sum + (pool.change24hPct ?? 0) * pool.tvlUsd, 0) / totalTvlUsd
      : 0


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
    borrowableAssets: selectBorrowableAssets(state, walletId),
    pendingRows: BORROW_PENDING_ROWS,
    dexes: BORROW_DEXES,
    collateralPools: selectBorrowCollateralPools(state, walletId),
    initialDebts: selectInitialBorrowDebts(state, walletId),
    borrowSnapshot: selectWalletBorrowSnapshot(state, walletId),
  }
}

export function buildPortfolioBorrowData(
  state: BorrowSystemState,
  walletId: string,
  now: number = Date.now(),
): PortfolioBorrowTabData {
  // Accrue once here so the portfolio HF/debt rows drift with interest between actions;
  // the low-level selectors below stay pure and select from this accrued copy.
  state = accrueBorrowSystemState(state, now)
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

export function resolvePoolDetailFromState(
  state: BorrowSystemState,
  walletId: string,
  poolId: string,
): PoolDetail | null {
  const resolvedId = HOME_POOL_TO_MARKET_ID[poolId] ?? poolId
  const row = selectBorrowMarketSummaries(state, walletId).find((candidate) => candidate.id === resolvedId)
  if (!row) return null
  return buildPoolDetail(row)
}

/** Convex market reference overrides applied to a borrowable asset before building its detail. */
export type AssetLiquidityOverrides = {
  availableUsd?: number
  totalBorrowedUsd?: number
  utilization?: number
  borrowApr?: number
}

export function resolveAssetDetailFromState(assetId: string, overrides?: AssetLiquidityOverrides): AssetDetail | null {
  const base = listSpokeBorrowables().find((candidate) => candidate.id === assetId) ?? resolveAsset(assetId)
  if (!base) return null
  const asset = overrides
    ? {
        ...base,
        availableUsd: overrides.availableUsd ?? base.availableUsd,
        totalBorrowedUsd: overrides.totalBorrowedUsd ?? base.totalBorrowedUsd,
        utilization: overrides.utilization ?? base.utilization,
        borrowApr: overrides.borrowApr ?? base.borrowApr,
      }
    : base
  return buildAssetDetail(asset)
}

export function readTotalBorrowedUsd(state: BorrowSystemState, walletId: string) {
  const account = state.accounts[walletId]
  if (!account) return 0
  return fixedToNumber(totalDebtValueUsd6(account), 6)
}
