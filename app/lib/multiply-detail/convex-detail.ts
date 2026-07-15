import "server-only"
import { buildHeroFeedFromConvexSeries } from "@/app/lib/chart-feeds"
import {
  fetchMultiplyCashflowBreakdown,
  fetchMultiplyContent,
  fetchMultiplyQuickStats,
  fetchMultiplyRecentTransactions,
  fetchMultiplyRisk,
  fetchMultiplySupplySeries,
} from "@/app/lib/multiply-system/market-hydration-server"
import { applyDetailContentOverlay, mergeAliasedQuickStats } from "@/app/lib/detail-page/live-detail-helpers"
import { getMultiplyMarketDetail } from "./index"
import type { MultiplyMarketDetail, MultiplyTxHistoryRow } from "./index"
import type { QuickStat } from "@/app/lib/borrow-detail"

/**
 * Server-only Convex-hydrated multiply detail builder. Overlays seeded/live data onto
 * the deterministic mock detail so the page's numbers come from Convex and match the
 * list/hero:
 *   - HERO chart (TVL)                      ← Convex daily series (replaces the old
 *                                             hash-random getMultiplyMarketHeroFeed)
 *   - quick stats (available / APYs)        ← Convex snapshot
 *   - cashflow / risk / content            ← Convex queries
 *   - transactions                         ← global walletEvents for this market,
 *                                            mapped onto the multiply row kinds
 * Each Convex read falls back to the mock value when unreachable, so the page always
 * renders.
 */

/** Map the generic walletEvents kinds onto the multiply history row kinds. */
const MULTIPLY_TX_KIND: Record<string, MultiplyTxHistoryRow["kind"]> = {
  supply: "add",
  borrow: "add",
  withdraw: "reduce",
  repay: "reduce",
  liquidation: "close",
  rewards: "interest",
}

function mapConvexTransactions(
  rows: ReadonlyArray<{
    id: string
    at: string
    kind: string
    amountLabel: string
    walletLabel?: string
    counterpartyLabel?: string
    txHashShort: string
  }> | null,
): MultiplyTxHistoryRow[] | null {
  if (!rows || rows.length === 0) return null
  return rows.map((r) => ({
    id: r.id,
    at: r.at,
    kind: MULTIPLY_TX_KIND[r.kind] ?? "rebalance",
    amountLabel: r.amountLabel,
    counterpartyLabel: r.counterpartyLabel,
    walletLabel: r.walletLabel,
    txHashShort: r.txHashShort,
  }))
}

/** Convex `getQuickStats` emits asset-style ids; map each to the multiply mock ids. */
const QUICK_STAT_ALIASES: Record<string, string[]> = {
  supplied: ["available"],
  supplyApy: ["supplyApy"],
  borrowApy: ["borrowApy"],
}

function mergeConvexQuickStats(
  base: QuickStat[],
  convex: ReadonlyArray<{ id: string; value: string; delta?: QuickStat["delta"] }> | null,
): QuickStat[] {
  return mergeAliasedQuickStats(base, convex, QUICK_STAT_ALIASES)
}

export async function getMultiplyMarketDetailFromConvex(id: string): Promise<MultiplyMarketDetail | null> {
  const detail = getMultiplyMarketDetail(id)
  if (!detail) return null
  const slug = detail.id

  const [supplyPoints, cashflow, transactions, risk, quickStats, content] = await Promise.all([
    fetchMultiplySupplySeries(slug),
    fetchMultiplyCashflowBreakdown(slug),
    fetchMultiplyRecentTransactions(slug),
    fetchMultiplyRisk(slug),
    fetchMultiplyQuickStats(slug),
    fetchMultiplyContent(slug),
  ])

  return applyDetailContentOverlay(
    {
      ...detail,
      quickStats: mergeConvexQuickStats(detail.quickStats, quickStats),
      heroFeed: buildHeroFeedFromConvexSeries(supplyPoints, "usdCompact") ?? detail.heroFeed,
      cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
      transactions: mapConvexTransactions(transactions) ?? detail.transactions,
      risk: (risk as typeof detail.risk) ?? detail.risk,
    },
    content,
  )
}
