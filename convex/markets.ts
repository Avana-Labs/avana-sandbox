/**
 * Market time-series queries — powers every numeric chart on the detail
 * pages that isn't revenue or engagement:
 *
 *   - `AssetDetail.historicalUtilization`       → `getHistoricalUtilization`
 *   - `AssetDetail.supplyBorrow`                → `getSupplyBorrow`
 *   - `AssetDetail.heroMetric.series`           → `getAssetHeroSeries`
 *   - `PoolDetail.heroMetric.series`            → `getPoolHeroSeries`
 *   - `PoolDetail.keyMetrics` / `AssetDetail.keyMetrics` → `getKeyMetrics`
 *   - `AssetDetail.quickStats` / `PoolDetail.quickStats` → `getQuickStats`
 *
 * All of these fold the `marketDailyStats` table. The UI keeps a single
 * `Series` / `Point` shape; this file is the only place that knows the
 * Convex column names.
 */

import { v } from "convex/values"
import { query, type QueryCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"

const RANGE_DAYS = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
  ALL: 720,
} as const

type RangeId = keyof typeof RANGE_DAYS

const rangeValidator = v.union(
  v.literal("1D"),
  v.literal("1W"),
  v.literal("1M"),
  v.literal("3M"),
  v.literal("1Y"),
  v.literal("ALL"),
)

/**
 * Historical utilization (borrowed ÷ supplied) over the last 12 months.
 * Returns shape: `Series`.
 */
export const getHistoricalUtilization = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const market = await resolveMarket(ctx, "asset", slug)
    if (!market) return null
    const rows = await dailyRows(ctx, market._id, "1Y")
    return {
      id: `${market._id}:historical-utilization`,
      label: "Utilization",
      points: rows.map((r) => ({ t: r.day, v: r.utilizationPct })),
    }
  },
})

/**
 * Supply, borrow and utilization for the asset page `SupplyBorrowCard`.
 * Returns `{ supplied, borrowed, utilization }` — each a `Series`.
 */
export const getSupplyBorrow = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const market = await resolveMarket(ctx, "asset", slug)
    if (!market) return null
    const rows = await dailyRows(ctx, market._id, "1Y")
    const mk = (field: keyof Doc<"marketDailyStats">, id: string, label: string) => ({
      id,
      label,
      points: rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) })),
    })
    return {
      supplied: mk("suppliedUsd", `${market._id}:sb:supplied`, "Supplied"),
      borrowed: mk("borrowedUsd", `${market._id}:sb:borrowed`, "Borrowed"),
      utilization: mk("utilizationPct", `${market._id}:sb:utilization`, "Utilization"),
    }
  },
})

/**
 * Range-selectable key-metric time-series for the key metrics chart.
 * Returns shape: `Series`.
 */
export const getKeyMetric = query({
  args: {
    scope: v.union(v.literal("asset"), v.literal("pool")),
    slug: v.string(),
    metric: v.union(
      v.literal("tvl"),
      v.literal("volume"),
      v.literal("fees"),
      v.literal("utilization"),
      v.literal("borrowApr"),
      v.literal("supplyApy"),
    ),
    range: rangeValidator,
  },
  handler: async (ctx, { scope, slug, metric, range }) => {
    const market = await resolveMarket(ctx, scope, slug)
    if (!market) return null
    const rows = await dailyRows(ctx, market._id, range)
    const field =
      metric === "tvl"
        ? "tvlUsd"
        : metric === "volume"
          ? "volumeUsd"
          : metric === "fees"
            ? "feesUsd"
            : metric === "utilization"
              ? "utilizationPct"
              : metric === "borrowApr"
                ? "borrowAprPct"
                : "supplyApyPct"
    return {
      id: `${market._id}:km:${metric}:${range}`,
      label: metric,
      points: rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) })),
    }
  },
})

/**
 * Quick-stats row values + 24h deltas derived from the two most recent daily
 * snapshots. The UI's `QuickStat[]` shape is built here so the data seam
 * stays in one place.
 */
export const getQuickStats = query({
  args: {
    scope: v.union(v.literal("asset"), v.literal("pool")),
    slug: v.string(),
  },
  handler: async (ctx, { scope, slug }) => {
    const market = await resolveMarket(ctx, scope, slug)
    if (!market) return null
    const rows = await dailyRows(ctx, market._id, "1W")
    const latest = rows[rows.length - 1]
    const prev = rows[rows.length - 2]
    if (!latest) return []
    const pct = (curr: number, old?: number) =>
      !old ? 0 : Math.round(((curr - old) / old) * 1000) / 10
    return [
      {
        id: "supplied",
        label: scope === "asset" ? "Total Supplied" : "TVL",
        value: formatCompactUsd(latest.suppliedUsd),
        delta: toDelta(pct(latest.suppliedUsd, prev?.suppliedUsd)),
      },
      {
        id: "borrowed",
        label: "Total Borrowed",
        value: formatCompactUsd(latest.borrowedUsd),
        delta: toDelta(pct(latest.borrowedUsd, prev?.borrowedUsd)),
      },
      {
        id: "utilization",
        label: "Utilization",
        value: `${latest.utilizationPct.toFixed(2)}%`,
        delta: toDelta(pct(latest.utilizationPct, prev?.utilizationPct)),
      },
      {
        id: "supplyApy",
        label: "Supply APY",
        value: `${latest.supplyApyPct.toFixed(2)}%`,
        delta: toDelta(pct(latest.supplyApyPct, prev?.supplyApyPct)),
      },
      {
        id: "borrowApy",
        label: "Borrow APY",
        value: `${latest.borrowAprPct.toFixed(2)}%`,
        delta: toDelta(pct(latest.borrowAprPct, prev?.borrowAprPct)),
      },
    ]
  },
})

async function dailyRows(ctx: QueryCtx, marketId: Id<"markets">, range: RangeId) {
  const days = RANGE_DAYS[range]
  const start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
  return ctx.db
    .query("marketDailyStats")
    .withIndex("by_market_day", (q) => q.eq("marketId", marketId).gte("day", start))
    .order("asc")
    .collect()
}

async function resolveMarket(ctx: QueryCtx, scope: "asset" | "pool", slug: string) {
  return ctx.db
    .query("markets")
    .withIndex("by_scope_slug", (q) => q.eq("scope", scope).eq("slug", slug))
    .unique()
}

function toDelta(pct: number) {
  if (pct === 0) return { value: 0, direction: "flat" as const, label: "0.0%" }
  if (pct > 0) return { value: pct, direction: "up" as const, label: `+${pct.toFixed(1)}%` }
  return { value: pct, direction: "down" as const, label: `${pct.toFixed(1)}%` }
}

function formatCompactUsd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`
  return `$${v.toFixed(2)}`
}
