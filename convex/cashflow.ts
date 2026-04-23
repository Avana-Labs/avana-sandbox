/**
 * Cashflow queries — powers:
 *   - `CashflowTrendCard` on the asset detail page     → `getRevenueForAsset`
 *   - `AssetCashflowCard` breakdown table              → `getBreakdownForAsset`
 *   - `CashflowCard` breakdown table on the pool page  → `getBreakdownForPool`
 *
 * All numbers are sourced from `marketRevenueDaily`. The UI expects 12 monthly
 * points; the aggregator here rolls daily rows up to calendar months in UTC.
 *
 * UI shapes: `CashflowTrend` and `CashflowCard` in `app/lib/borrow-detail/types.ts`.
 */

import { v } from "convex/values"
import { query, type QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

const MONTHS = 12

/**
 * Monthly gross revenue (interest paid by borrowers) for an asset.
 * Returns shape: `CashflowTrend`.
 */
export const getRevenueForAsset = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const market = await resolveMarket(ctx, "asset", slug)
    if (!market) return null
    const monthly = await monthlyRevenue(ctx, market._id)
    const points = monthly.map((m) => ({ t: m.month, v: m.interestFromBorrowersUsd }))
    const total = points.reduce((a, p) => a + p.v, 0)
    return {
      totalLabel: formatCompactUsd(total),
      periodLabel: "Yearly",
      series: {
        id: `${market._id}:cf:revenue`,
        label: "Revenue",
        points,
        aggregate: total / Math.max(1, points.length),
      },
    }
  },
})

/**
 * Breakdown rows + monthly bars for an asset. Returns shape: `CashflowCard`.
 */
export const getBreakdownForAsset = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const market = await resolveMarket(ctx, "asset", slug)
    if (!market) return null
    return buildBreakdown(ctx, market._id, "asset")
  },
})

/**
 * Breakdown rows + monthly bars for a pool. Returns shape: `CashflowCard`.
 */
export const getBreakdownForPool = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const market = await resolveMarket(ctx, "pool", slug)
    if (!market) return null
    return buildBreakdown(ctx, market._id, "pool")
  },
})

async function buildBreakdown(ctx: QueryCtx, marketId: Id<"markets">, scope: "asset" | "pool") {
  const monthly = await monthlyRevenue(ctx, marketId)
  const ttm = monthly.reduce(
    (acc, m) => ({
      interestFromBorrowersUsd: acc.interestFromBorrowersUsd + m.interestFromBorrowersUsd,
      interestToSuppliersUsd: acc.interestToSuppliersUsd + m.interestToSuppliersUsd,
      reserveTakeUsd: acc.reserveTakeUsd + m.reserveTakeUsd,
      rewardsDistributedUsd: acc.rewardsDistributedUsd + m.rewardsDistributedUsd,
      swapFeesUsd: acc.swapFeesUsd + m.swapFeesUsd,
    }),
    { interestFromBorrowersUsd: 0, interestToSuppliersUsd: 0, reserveTakeUsd: 0, rewardsDistributedUsd: 0, swapFeesUsd: 0 },
  )

  const feesSeries = {
    id: `${marketId}:cf:fees`,
    label: scope === "pool" ? "Swap fees" : "Interest",
    points: monthly.map((m) => ({ t: m.month, v: scope === "pool" ? m.swapFeesUsd : m.interestFromBorrowersUsd })),
  }
  const rewardsSeries = {
    id: `${marketId}:cf:rewards`,
    label: "Rewards",
    points: monthly.map((m) => ({ t: m.month, v: m.rewardsDistributedUsd })),
  }

  const rows =
    scope === "pool"
      ? [
          { label: "Swap fees", reported: formatCompactUsd(ttm.swapFeesUsd), highlighted: true },
          { label: "LP incentives", reported: formatCompactUsd(ttm.rewardsDistributedUsd) },
          { label: "Protocol revenue", reported: formatCompactUsd(ttm.reserveTakeUsd) },
          { label: "Net to suppliers", reported: formatCompactUsd(ttm.interestToSuppliersUsd + ttm.swapFeesUsd * 0.9), highlighted: true },
        ]
      : [
          { label: "Interest paid by borrowers", reported: formatCompactUsd(ttm.interestFromBorrowersUsd), highlighted: true },
          { label: "To suppliers", reported: formatCompactUsd(ttm.interestToSuppliersUsd) },
          { label: "Reserve", reported: formatCompactUsd(ttm.reserveTakeUsd) },
          { label: "Rewards distributed", reported: formatCompactUsd(ttm.rewardsDistributedUsd) },
          { label: "Net to suppliers", reported: formatCompactUsd(ttm.interestToSuppliersUsd + ttm.rewardsDistributedUsd), highlighted: true },
        ]

  return {
    bars: [feesSeries, rewardsSeries],
    periodLabel: "Last 12 months",
    rows,
  }
}

/**
 * Daily-revenue → monthly rollup. Groups by first-of-month in UTC.
 * Missing months are zero-filled so the chart always has 12 points.
 */
async function monthlyRevenue(ctx: QueryCtx, marketId: Id<"markets">) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1), 1))
  const startDay = start.toISOString().slice(0, 10)

  const rows = await ctx.db
    .query("marketRevenueDaily")
    .withIndex("by_market_day", (q) => q.eq("marketId", marketId).gte("day", startDay))
    .collect()

  type Bucket = {
    month: string
    interestFromBorrowersUsd: number
    interestToSuppliersUsd: number
    reserveTakeUsd: number
    rewardsDistributedUsd: number
    swapFeesUsd: number
  }
  const buckets = new Map<string, Bucket>()
  for (let i = 0; i < MONTHS; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
    const key = d.toISOString().slice(0, 7) + "-01"
    buckets.set(key, {
      month: key,
      interestFromBorrowersUsd: 0,
      interestToSuppliersUsd: 0,
      reserveTakeUsd: 0,
      rewardsDistributedUsd: 0,
      swapFeesUsd: 0,
    })
  }
  for (const row of rows) {
    const key = row.day.slice(0, 7) + "-01"
    const b = buckets.get(key)
    if (!b) continue
    b.interestFromBorrowersUsd += row.interestFromBorrowersUsd
    b.interestToSuppliersUsd += row.interestToSuppliersUsd
    b.reserveTakeUsd += row.reserveTakeUsd
    b.rewardsDistributedUsd += row.rewardsDistributedUsd
    b.swapFeesUsd += row.swapFeesUsd
  }
  return [...buckets.values()]
}

async function resolveMarket(ctx: QueryCtx, scope: "asset" | "pool", slug: string) {
  return ctx.db
    .query("markets")
    .withIndex("by_scope_slug", (q) => q.eq("scope", scope).eq("slug", slug))
    .unique()
}

function formatCompactUsd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`
  return `$${v.toFixed(2)}`
}
