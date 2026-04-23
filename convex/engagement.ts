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

type SecondaryKind = "repay" | "borrow"

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
 * Conversion metric per scope. Kept simple (and correct by construction)
 * so anyone replacing the mock can reason about it without reading the UI.
 */
async function computeConversionPct(
  ctx: QueryCtx,
  marketId: Id<"markets">,
  kind: SecondaryKind,
  _since: number,
  _now: number,
): Promise<{ valuePct: number; deltaPct: number }> {
  // TODO(convex-wire-up): implement once walletEvents is indexed.
  // For `repay`  : fraction of unique borrowers who emitted a `repay` event
  //                within 30 days of their latest `borrow`.
  // For `borrow` : fraction of unique suppliers who emitted a `borrow` event
  //                within 24 hours of their latest `supply`.
  void ctx
  void marketId
  void kind
  return { valuePct: 0, deltaPct: 0 }
}

function toDelta(pct: number) {
  if (pct === 0) return { value: 0, direction: "flat" as const, label: "0.0%" }
  if (pct > 0) return { value: pct, direction: "up" as const, label: `+${pct.toFixed(1)}%` }
  return { value: pct, direction: "down" as const, label: `${pct.toFixed(1)}%` }
}
