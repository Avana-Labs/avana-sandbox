import "server-only"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { mergeConvexMarketSnapshots } from "@/app/lib/borrow-system/market-hydration"
import {
  fetchAssetBorrowSeries,
  fetchAssetCashflowTrend,
  fetchCashflowBreakdown,
  fetchConvexMarketSnapshots,
  fetchEngagement,
  fetchPoolTvlSeries,
  fetchRecentTransactions,
} from "@/app/lib/borrow-system/market-hydration-server"
import { resolveAssetDetailFromState, resolvePoolDetailFromState } from "@/app/lib/borrow-system/read-model"
import { buildHeroFeedFromConvexSeries } from "@/app/lib/chart-feeds"
import { normalizeBorrowAssetRouteId, normalizeBorrowMarketRouteId } from "@/app/lib/borrow-routes"
import { getDefaultWalletProfileId } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import type { AssetDetail, PoolDetail } from "./types"

/**
 * Server-only Convex-hydrated detail builders. The borrow detail pages call these
 * so their numbers come from Convex and match the list/hero:
 *   - reference values (TVL, available, utilization, APY, quick stats) ← Convex snapshot
 *   - HERO chart (pool = TVL / total supplied, asset = total borrows) ← Convex daily series
 *   - engagement (active wallets/sessions) ← Convex walletEvents
 * Each Convex read falls back to the catalog/mock value when unreachable, so the
 * page always renders.
 *
 * Kept OUT of `./index.ts` because that module is also imported by client
 * components, and `market-hydration-server.ts` is `server-only`.
 */
const detailWalletId = getDefaultWalletProfileId()

export async function getPoolDetailFromConvex(id: string): Promise<PoolDetail | null> {
  const snapshots = await fetchConvexMarketSnapshots()
  const state = buildMockBorrowSystemState(detailWalletId)
  const hydrated = snapshots.length > 0 ? mergeConvexMarketSnapshots(state, snapshots) : state
  const detail = resolvePoolDetailFromState(hydrated, detailWalletId, normalizeBorrowMarketRouteId(id))
  if (!detail) return null

  const [tvlPoints, engagement, cashflow, transactions] = await Promise.all([
    fetchPoolTvlSeries(detail.row.id),
    fetchEngagement("pool", detail.row.id),
    fetchCashflowBreakdown("pool", detail.row.id),
    fetchRecentTransactions("pool", detail.row.id),
  ])
  return {
    ...detail,
    heroFeed: buildHeroFeedFromConvexSeries(tvlPoints, "usdCompact") ?? detail.heroFeed,
    engagement: (engagement as typeof detail.engagement) ?? detail.engagement,
    cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
    transactions: (transactions as typeof detail.transactions) ?? detail.transactions,
  }
}

export async function getAssetDetailFromConvex(id: string): Promise<AssetDetail | null> {
  const slug = normalizeBorrowAssetRouteId(id)
  const snapshots = await fetchConvexMarketSnapshots()
  const snap = snapshots.find((row) => row.scope === "asset" && row.slug === slug)
  const detail = resolveAssetDetailFromState(
    slug,
    snap
      ? {
          availableUsd: snap.availableUsd,
          totalBorrowedUsd: snap.borrowedUsd,
          utilization: snap.utilizationPct,
          borrowApr: snap.borrowAprPct,
        }
      : undefined,
  )
  if (!detail) return null

  const [borrowPoints, engagement, cashflow, cashflowTrend, transactions] = await Promise.all([
    fetchAssetBorrowSeries(slug),
    fetchEngagement("asset", slug),
    fetchCashflowBreakdown("asset", slug),
    fetchAssetCashflowTrend(slug),
    fetchRecentTransactions("asset", slug),
  ])
  return {
    ...detail,
    heroFeed: buildHeroFeedFromConvexSeries(borrowPoints, "usdCompact") ?? detail.heroFeed,
    engagement: (engagement as typeof detail.engagement) ?? detail.engagement,
    cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
    cashflowTrend: (cashflowTrend as typeof detail.cashflowTrend) ?? detail.cashflowTrend,
    transactions: (transactions as typeof detail.transactions) ?? detail.transactions,
  }
}
