/**
 * Public data seam for the borrow / lend detail pages.
 *
 * UI imports from this module only. The underlying mock implementations live
 * in sibling files (`pool.mock.ts`, `asset.mock.ts`, `allocation.ts`) and can
 * be swapped for real fetchers without changing the call sites.
 *
 * Contract test lives in `./__tests__/contract.test.ts` — keep it green when
 * you swap mocks for real data and the UI will keep working.
 */

import { BORROWABLE_ASSETS, BORROW_POOL_CATALOG } from "@/app/lib/borrow-sim"
import { buildPoolDetail, resolvePoolRow } from "./pool.mock"
import { buildAssetDetail, resolveAsset } from "./asset.mock"
import type { AssetDetail, PoolDetail } from "./types"

export type { PoolDetail, AssetDetail } from "./types"
export type {
  AllocationRow,
  AboutCard,
  CashflowCard,
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
export { HOME_POOL_ID_MAP } from "./pool.mock"

/**
 * Returns the detail view model for a pool id.
 *
 * Accepts:
 * - Catalog ids (e.g. `uni-v3-bluechip-weth-usdc`)
 * - Home-page ids (`eth-usdc`, `wbtc-eth`, `usdc-usdt`)
 * - `null`/unknown → `null` (caller should render `notFound()`).
 */
export function getPoolDetail(id: string): PoolDetail | null {
  const row = resolvePoolRow(id)
  if (!row) return null
  return buildPoolDetail(row)
}

/** Returns every (id, detail) that can be rendered. Used for warm-up / tests. */
export function listAllPoolDetails(): PoolDetail[] {
  return BORROW_POOL_CATALOG.map((row) => buildPoolDetail(row))
}

/** Returns the detail view-model for a borrowable asset id. */
export function getAssetDetail(id: string): AssetDetail | null {
  const asset = resolveAsset(id)
  if (!asset) return null
  return buildAssetDetail(asset)
}

export function listAllAssetDetails(): AssetDetail[] {
  return BORROWABLE_ASSETS.map((asset) => buildAssetDetail(asset))
}
