import "server-only"
import { buildHeroFeedFromConvexSeries } from "@/app/lib/chart-feeds"
import {
  fetchMultiplyCashflowBreakdown,
  fetchMultiplyContent,
  fetchMultiplyEngagement,
  fetchMultiplyQuickStats,
  fetchMultiplyRisk,
  fetchMultiplySupplySeries,
} from "@/app/lib/multiply-system/market-hydration-server"
import { getMultiplyMarketDetail } from "./index"
import type { MultiplyMarketDetail } from "./index"
import type { QuickStat } from "@/app/lib/borrow-detail"

/**
 * Server-only Convex-hydrated multiply detail builder. Overlays seeded/live data onto
 * the deterministic mock detail so the page's numbers come from Convex and match the
 * list/hero:
 *   - HERO chart (TVL)                      ← Convex daily series (replaces the old
 *                                             hash-random getMultiplyMarketHeroFeed)
 *   - quick stats (available / APYs)        ← Convex snapshot
 *   - engagement / cashflow / risk / content ← Convex queries
 * Each Convex read falls back to the mock value when unreachable, so the page always
 * renders. Transactions stay on the mock feed (multiply tx kinds — open/add/reduce/… —
 * don't map onto the generic walletEvents kinds); per-wallet history is item 3.
 */

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
  if (!convex || convex.length === 0) return base
  const byMockId = new Map<string, { value: string; delta?: QuickStat["delta"] }>()
  for (const c of convex) {
    for (const mockId of QUICK_STAT_ALIASES[c.id] ?? [c.id]) byMockId.set(mockId, c)
  }
  return base.map((s) => {
    const c = byMockId.get(s.id)
    return c ? { ...s, value: c.value, delta: c.delta ?? s.delta } : s
  })
}

export async function getMultiplyMarketDetailFromConvex(id: string): Promise<MultiplyMarketDetail | null> {
  const detail = getMultiplyMarketDetail(id)
  if (!detail) return null
  const slug = detail.id

  const [supplyPoints, engagement, cashflow, risk, quickStats, content] = await Promise.all([
    fetchMultiplySupplySeries(slug),
    fetchMultiplyEngagement(slug),
    fetchMultiplyCashflowBreakdown(slug),
    fetchMultiplyRisk(slug),
    fetchMultiplyQuickStats(slug),
    fetchMultiplyContent(slug),
  ])

  return {
    ...detail,
    quickStats: mergeConvexQuickStats(detail.quickStats, quickStats),
    heroFeed: buildHeroFeedFromConvexSeries(supplyPoints, "usdCompact") ?? detail.heroFeed,
    engagement: (engagement as typeof detail.engagement) ?? detail.engagement,
    cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
    risk: (risk as typeof detail.risk) ?? detail.risk,
    about: content
      ? { ...detail.about, description: content.description, stats: content.stats, history: content.history }
      : detail.about,
    faqs: content?.faqs ?? detail.faqs,
  }
}
