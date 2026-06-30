/**
 * Engagement queries — powers the `EngagementTrendsCard` on both the asset
 * and pool detail pages.
 *
 * Engagement = distinct wallets emitting any `walletEvents` row in a window.
 * The cadence (daily / weekly) and the "conversion" metric differ slightly
 * per scope; implementations should stay pure aggregations over the
 * `walletEvents` table so the UI shape never depends on mock heuristics.
 *
 * UI shape: `EngagementTrend` in `app/lib/borrow-detail/types.ts`.
 */

import { v } from "convex/values"
import { query, type QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

const WINDOW_DAYS = 12
const DAY_MS = 86_400_000

/** How far back conversion looks (wider than the 12-day engagement window so it
 *  robustly covers the seeded wallet-event window regardless of small clock drift). */
const CONVERSION_LOOKBACK_DAYS = 45
/** A repay "converts" a borrow if it lands within 30 days of the latest borrow. */
const REPAY_WINDOW_MS = 30 * DAY_MS
/** A borrow "converts" a supply if it lands within 24 hours of the latest supply. */
const SUPPLY_TO_BORROW_WINDOW_MS = DAY_MS

/**
 * Engagement for a single asset.
 *
 * Primary KPI  : active wallets today.
 * Secondary KPI: repay conversion = borrowers-who-repaid-within-30d / borrowers.
 *
 * Returns data shaped as `EngagementTrend`.
 */
export const getForAsset = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_scope_slug", (q) => q.eq("scope", "asset").eq("slug", slug))
      .unique()
    if (!market) return null
    return buildEngagement(ctx, market._id, {
      primaryLabel: "Active wallets",
      secondaryLabel: "Repay conversion",
      secondaryKind: "repay",
    })
  },
})

/**
 * Engagement for a pool.
 *
 * Primary KPI  : active wallets today.
 * Secondary KPI: borrow conversion = wallets that supplied then borrowed
 *                within a 24h window.
 */
export const getForPool = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_scope_slug", (q) => q.eq("scope", "pool").eq("slug", slug))
      .unique()
    if (!market) return null
    return buildEngagement(ctx, market._id, {
      primaryLabel: "Active wallets",
      secondaryLabel: "Borrow conversion",
      secondaryKind: "borrow",
    })
  },
})

/**
 * Engagement for a lend (single-asset supply) market.
 *
 * Primary KPI  : active wallets today.
 * Secondary KPI: supply retention = suppliers who did NOT exit (withdraw) within
 *                30 days of their latest supply.
 */
export const getForLend = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_scope_slug", (q) => q.eq("scope", "lend").eq("slug", slug))
      .unique()
    if (!market) return null
    return buildEngagement(ctx, market._id, {
      primaryLabel: "Active wallets",
      secondaryLabel: "Supply retention",
      secondaryKind: "supply",
    })
  },
})

/**
 * Engagement for a multiply (leveraged loop) market.
 *
 * Primary KPI  : active wallets today.
 * Secondary KPI: loop conversion = wallets that supplied collateral then borrowed
 *                (opened a loop) within a 24h window.
 */
export const getForMultiply = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_scope_slug", (q) => q.eq("scope", "multiply").eq("slug", slug))
      .unique()
    if (!market) return null
    return buildEngagement(ctx, market._id, {
      primaryLabel: "Active wallets",
      secondaryLabel: "Loop conversion",
      secondaryKind: "borrow",
    })
  },
})

type SecondaryKind = "repay" | "borrow" | "supply"

type Cfg = {
  primaryLabel: string
  secondaryLabel: string
  secondaryKind: SecondaryKind
}

/**
 * Shared aggregator. Pull all events for this market in the last N days,
 * bucket distinct-wallet counts per UTC day, and compute a conversion metric.
 * Keep this logic here (not in the mock layer) — the UI consumes the shape
 * directly.
 */
async function buildEngagement(ctx: QueryCtx, marketId: Id<"markets">, cfg: Cfg) {
  const now = Date.now()
  const since = now - WINDOW_DAYS * DAY_MS

  const events = await ctx.db
    .query("walletEvents")
    .withIndex("by_market_at", (q) => q.eq("marketId", marketId).gte("at", since))
    .collect()

  const buckets = new Map<string, Set<string>>()
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const day = new Date(now - i * DAY_MS).toISOString().slice(0, 10)
    buckets.set(day, new Set())
  }
  for (const e of events) {
    const day = new Date(e.at).toISOString().slice(0, 10)
    const bucket = buckets.get(day)
    if (bucket) bucket.add(e.wallet.toLowerCase())
  }

  const points = [...buckets.entries()].map(([day, wallets]) => ({
    t: day,
    v: wallets.size,
  }))
  const current = points[points.length - 1]?.v ?? 0
  const previous = points[points.length - 2]?.v ?? 0
  const deltaPct = previous === 0 ? 0 : Math.round(((current - previous) / previous) * 1000) / 10

  const conversion = await computeConversionPct(ctx, marketId, cfg.secondaryKind, since, now)

  return {
    title: "User Engagement Trends",
    primary: {
      label: cfg.primaryLabel,
      valueLabel: current.toLocaleString(),
      delta: toDelta(deltaPct),
    },
    secondary: {
      label: cfg.secondaryLabel,
      valueLabel: `${conversion.valuePct.toFixed(1)}%`,
      delta: toDelta(conversion.deltaPct),
    },
    series: {
      id: `${marketId}:engagement`,
      label: cfg.primaryLabel,
      points,
    },
  }
}

/**
 * Conversion metric per scope, computed purely from `walletEvents`:
 *   - `repay`  : fraction of unique borrowers who emitted a `repay` within 30
 *                days of their latest `borrow`.
 *   - `borrow` : fraction of unique suppliers who emitted a `borrow` within 24
 *                hours of their latest `supply`.
 *
 * `valuePct` is over the full lookback; `deltaPct` is the change (in points)
 * between the older and the more-recent half of the window.
 */
async function computeConversionPct(
  ctx: QueryCtx,
  marketId: Id<"markets">,
  kind: SecondaryKind,
  since: number,
  now: number,
): Promise<{ valuePct: number; deltaPct: number }> {
  void since
  const lookbackStart = now - CONVERSION_LOOKBACK_DAYS * DAY_MS
  const events = await ctx.db
    .query("walletEvents")
    .withIndex("by_market_at", (q) => q.eq("marketId", marketId).gte("at", lookbackStart))
    .collect()

  const [fromKind, toKind, windowMs] =
    kind === "repay"
      ? (["borrow", "repay", REPAY_WINDOW_MS] as const)
      : kind === "borrow"
        ? (["supply", "borrow", SUPPLY_TO_BORROW_WINDOW_MS] as const)
        : (["supply", "withdraw", REPAY_WINDOW_MS] as const)

  const rate = (rows: typeof events): number => {
    // latest `fromKind` time per wallet + all `toKind` times per wallet
    const latestFrom = new Map<string, number>()
    const toTimes = new Map<string, number[]>()
    for (const e of rows) {
      const w = e.wallet.toLowerCase()
      if (e.kind === fromKind) {
        const prev = latestFrom.get(w)
        if (prev === undefined || e.at > prev) latestFrom.set(w, e.at)
      } else if (e.kind === toKind) {
        const arr = toTimes.get(w)
        if (arr) arr.push(e.at)
        else toTimes.set(w, [e.at])
      }
    }
    if (latestFrom.size === 0) return 0
    let converted = 0
    for (const [w, from] of latestFrom) {
      const tos = toTimes.get(w)
      if (tos && tos.some((t) => t > from && t <= from + windowMs)) converted++
    }
    return (converted / latestFrom.size) * 100
  }

  const valuePct = Math.round(rate(events) * 10) / 10

  // Trend: compare the older half of the window to the more-recent half.
  const mid = lookbackStart + (now - lookbackStart) / 2
  const older = events.filter((e) => e.at < mid)
  const recent = events.filter((e) => e.at >= mid)
  const deltaPct =
    older.length > 0 && recent.length > 0 ? Math.round((rate(recent) - rate(older)) * 10) / 10 : 0

  // "supply" expresses RETENTION = 100 − the exit (supply→withdraw) rate, so invert
  // both the value and the trend direction.
  if (kind === "supply") {
    return { valuePct: Math.round((100 - valuePct) * 10) / 10, deltaPct: -deltaPct }
  }

  return { valuePct, deltaPct }
}

function toDelta(pct: number) {
  if (pct === 0) return { value: 0, direction: "flat" as const, label: "0.0%" }
  if (pct > 0) return { value: pct, direction: "up" as const, label: `+${pct.toFixed(1)}%` }
  return { value: pct, direction: "down" as const, label: `${pct.toFixed(1)}%` }
}
