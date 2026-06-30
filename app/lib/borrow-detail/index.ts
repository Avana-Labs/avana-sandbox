/**
 * Public data seam for the borrow / lend detail pages.
 *
 * UI imports from this module only. The underlying mock implementations live
 * in sibling files (`pool.mock.ts`, `asset.mock.ts`, `allocation.ts`) and can
 * be swapped for real fetchers without changing the call sites.
 *
 * Contract test lives in `./__tests__/contract.test.ts` — keep it green when
 * you swap mocks for real data and the UI will keep working.
 *
 * ─── Convex migration ────────────────────────────────────────────────────
 * When `convex/schema.ts` is populated and data is flowing, replace the
 * `build*Detail` calls below with Convex query invocations. The queries are
 * already defined and return the exact UI shapes — see:
 *
 *   convex/engagement.ts    EngagementTrend  (asset + pool)
 *   convex/cashflow.ts      CashflowTrend + CashflowCard
 *   convex/markets.ts       Series for hero + key metrics + supply/borrow
 *   convex/allocation.ts    AllocationRow[]
 *
 * Server component example once wired:
 *
 *   import { fetchQuery } from "convex/nextjs"
 *   import { api } from "@/convex/_generated/api"
 *   const [engagement, cashflow, utilization] = await Promise.all([
 *     fetchQuery(api.engagement.getForAsset, { slug }),
 *     fetchQuery(api.cashflow.getRevenueForAsset, { slug }),
 *     fetchQuery(api.markets.getHistoricalUtilization, { slug }),
 *   ])
 *   return { ...buildAssetDetail(row), engagement, cashflowTrend: cashflow, historicalUtilization: utilization }
 *
 * That pattern works card-by-card, so the mocks can be peeled off as each
 * Convex table is populated — no big-bang migration needed.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { getDefaultWalletProfileId } from "@/app/lib/data/wallet/profiles"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { listSpokeBorrowables } from "@/app/lib/borrow-system/registry"
import { selectBorrowMarketSummaries } from "@/app/lib/borrow-system/selectors"
import { resolveAssetDetailFromState, resolvePoolDetailFromState } from "@/app/lib/borrow-system/read-model"
import { normalizeBorrowAssetRouteId, normalizeBorrowMarketRouteId } from "@/app/lib/borrow-routes"
import type { AssetDetail, PoolDetail } from "./types"

const detailWalletId = getDefaultWalletProfileId()
const detailState = buildMockBorrowSystemState(detailWalletId)
const detailPoolRows = selectBorrowMarketSummaries(detailState, detailWalletId)
const detailAssets = listSpokeBorrowables()

export type { PoolDetail, AssetDetail } from "./types"
export type {
  AllocationRow,
  AboutCard,
  CashflowCard,
  CashflowTrend,
  EngagementTrend,
  ChartMetricId,
  KeyMetricId,
  PerfTab,
  PerfPeriod,
  PerfTabDataset,
  PoolDetailHero,
  AssetDetailHero,
  QuickStat,
  DeltaStat,
  RelatedPoolSummary,
  RelatedAssetSummary,
  RiskAssessment,
  RiskBreakdownItem,
  RiskLevel,
  RiskMetric,
  Series,
  Point,
  TimeRangeId,
  TxHistoryRow,
  AssetChartMetricId,
} from "./types"
export {
  ALL_TIME_RANGES,
  ALL_CHART_METRICS,
  ALL_KEY_METRICS,
  ALL_PERF_TABS,
  ALL_PERF_PERIODS,
  ALL_ASSET_CHART_METRICS,
} from "./types"
export {
  computeAssetAllocation,
  formatBpsAsPct,
  formatPct,
  riskLevelFromBps,
  riskLevelLabel,
  riskScoreFromBps,
} from "./allocation"
export { borrowAssetDetailPath, borrowMarketDetailPath, normalizeBorrowAssetRouteId, normalizeBorrowMarketRouteId } from "@/app/lib/borrow-routes"
export { HOME_POOL_TO_MARKET_ID as HOME_POOL_ID_MAP } from "@/app/lib/borrow-system/mock"

/**
 * Returns the detail view model for a pool id.
 *
 * Accepts:
 * - Catalog ids (e.g. `uni-v3-bluechip-weth-usdc`)
 * - Home-page ids (`eth-usdc`, `wbtc-eth`, `usdc-usdt`)
 * - `null`/unknown → `null` (caller should render `notFound()`).
 */
export function getPoolDetail(id: string): PoolDetail | null {
  return resolvePoolDetailFromState(detailState, detailWalletId, normalizeBorrowMarketRouteId(id))
}

/** Returns every (id, detail) that can be rendered. Used for warm-up / tests. */
export function listAllPoolDetails(): PoolDetail[] {
  return detailPoolRows
    .map((row) => resolvePoolDetailFromState(detailState, detailWalletId, row.id))
    .filter((detail): detail is PoolDetail => detail !== null)
}

/** Returns the detail view-model for a borrowable asset id. */
export function getAssetDetail(id: string): AssetDetail | null {
  return resolveAssetDetailFromState(normalizeBorrowAssetRouteId(id))
}

export function listAllAssetDetails(): AssetDetail[] {
  return detailAssets
    .map((asset) => resolveAssetDetailFromState(asset.id))
    .filter((detail): detail is AssetDetail => detail !== null)
}
