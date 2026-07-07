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
import { internalMutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"

/** Single cache row discriminator (see `marketSnapshotsCache` in schema.ts). */
const SNAPSHOTS_SINGLETON = "markets"

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
    scope: v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"), v.literal("multiply")),
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
        label: scope === "pool" ? "TVL" : "Total Supplied",
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

/**
 * Borrow economy headline aggregates from the latest daily snapshot per market.
 * Efficient: one indexed read per market (≈128), never a full-table scan.
 *   - Total Collateral = Σ latest pool suppliedUsd (pools = LP collateral)
 *   - Outstanding Loans = Σ latest asset suppliedUsd (borrowable assets, ≈ fully borrowed)
 *   - Available Credit  = Collateral − Loans
 */
export const getBorrowEconomy = query({
  args: {},
  handler: async (ctx) => {
    const markets = await ctx.db.query("markets").collect()
    let totalCollateralUsd = 0
    let outstandingLoansUsd = 0
    for (const market of markets) {
      if (market.scope !== "pool" && market.scope !== "asset") continue
      const latest = await ctx.db
        .query("marketDailyStats")
        .withIndex("by_market_day", (q) => q.eq("marketId", market._id))
        .order("desc")
        .first()
      if (!latest) continue
      if (market.scope === "pool") totalCollateralUsd += latest.suppliedUsd
      else outstandingLoansUsd += latest.suppliedUsd
    }
    return {
      totalCollateralUsd,
      outstandingLoansUsd,
      availableCreditUsd: Math.max(0, totalCollateralUsd - outstandingLoansUsd),
      poolMarkets: markets.filter((m) => m.scope === "pool").length,
      assetMarkets: markets.filter((m) => m.scope === "asset").length,
    }
  },
})

/**
 * Recompute the latest-day reference snapshot for every market (one indexed read
 * per market). This is the EXPENSIVE path (`markets.collect()` + ~173 reads); it
 * runs in `rebuildMarketSnapshots` on write / on schedule, never on the hot
 * subscribed query — and, defensively, as a cold-cache fallback below.
 */
async function computeMarketSnapshots(ctx: QueryCtx | MutationCtx) {
  const markets = await ctx.db.query("markets").collect()
  const out = await Promise.all(
    markets.map(async (market) => {
      const latest = await ctx.db
        .query("marketDailyStats")
        .withIndex("by_market_day", (q) => q.eq("marketId", market._id))
        .order("desc")
        .first()
      if (!latest) return null
      return {
        slug: market.slug,
        scope: market.scope,
        name: market.name,
        symbol: market.symbol,
        chainId: market.chainId,
        venueLabel: market.venueLabel,
        category: market.category,
        description: market.description,
        iconUrl: market.iconUrl,
        spokeId: market.spokeId,
        feeTier: market.feeTier,
        maxLtvPct: market.maxLtvPct,
        visuals: market.visuals,
        resources: market.resources,
        suppliedUsd: latest.suppliedUsd,
        borrowedUsd: latest.borrowedUsd,
        availableUsd: Math.max(0, latest.suppliedUsd - latest.borrowedUsd),
        utilizationPct: latest.utilizationPct,
        supplyApyPct: latest.supplyApyPct,
        borrowAprPct: latest.borrowAprPct,
        tvlUsd: latest.tvlUsd,
        volumeUsd: latest.volumeUsd,
        feesUsd: latest.feesUsd,
      }
    }),
  )
  return out.filter((row): row is NonNullable<typeof row> => row !== null)
}

/**
 * Latest-day reference snapshot for every market. Subscribed app-wide, so it reads
 * the single precomputed `marketSnapshotsCache` document (O(1) reads) instead of
 * recomputing from ~173 per-market reads on every subscriber recompute. Powers the
 * borrow list/Explore cards and the session market-data hydration so every surface
 * reads the same Convex numbers. Keyed by the market `slug` (pool id, or
 * spoke-scoped asset id) for a direct lookup against the catalog.
 *
 * Cold-cache fallback: if the cache has not been built yet (fresh deploy, before
 * the first `rebuildMarketSnapshots`), fall back to the recompute so the app still
 * hydrates. Steady state never hits that path.
 */
export const listMarketSnapshots = query({
  args: {},
  handler: async (ctx) => {
    const cache = await ctx.db
      .query("marketSnapshotsCache")
      .withIndex("by_singleton", (q) => q.eq("singleton", SNAPSHOTS_SINGLETON))
      .unique()
    if (cache) return cache.rows
    return computeMarketSnapshots(ctx)
  },
})

/**
 * Rebuild the `listMarketSnapshots` cache document. Runs the expensive recompute
 * once and upserts the single cache row. Call this from the market-data write path
 * (seed / aggregator) after landing daily stats, or from a schedule — never on the
 * hot read path. Internal-only so anonymous callers can't trigger the full recompute.
 */
export const rebuildMarketSnapshots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await computeMarketSnapshots(ctx)
    const existing = await ctx.db
      .query("marketSnapshotsCache")
      .withIndex("by_singleton", (q) => q.eq("singleton", SNAPSHOTS_SINGLETON))
      .unique()
    const doc = { singleton: SNAPSHOTS_SINGLETON, rows, updatedAt: Date.now() }
    if (existing) await ctx.db.replace(existing._id, doc)
    else await ctx.db.insert("marketSnapshotsCache", doc)
    return { markets: rows.length }
  },
})

const assetHeroMetric = v.union(
  v.literal("price"),
  v.literal("supply"),
  v.literal("borrow"),
  v.literal("utilization"),
  v.literal("apy"),
)

/** Asset-page hero series (price/supply/borrow/utilization/apy) folded from daily stats. */
export const getAssetHeroSeries = query({
  args: { slug: v.string(), metric: assetHeroMetric, range: rangeValidator },
  handler: async (ctx, { slug, metric, range }) => {
    const market = await resolveMarket(ctx, "asset", slug)
    if (!market) return null
    const rows = await dailyRows(ctx, market._id, range)
    const field =
      metric === "price"
        ? "priceUsd"
        : metric === "supply"
          ? "suppliedUsd"
          : metric === "borrow"
            ? "borrowedUsd"
            : metric === "utilization"
              ? "utilizationPct"
              : "borrowAprPct"
    const points = rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) }))
    const delta = await liveMarketDelta(ctx, market.slug)
    const deltaUsd = metric === "supply" ? delta.suppliedDeltaUsd : metric === "borrow" ? delta.borrowedDeltaUsd : 0
    return {
      id: `${market._id}:hero:${metric}:${range}`,
      label: metric,
      points: withLiveTip(points, deltaUsd),
    }
  },
})

const poolHeroMetric = v.union(
  v.literal("tvl"),
  v.literal("volume"),
  v.literal("fees"),
  v.literal("utilization"),
  v.literal("apy"),
)

/** Pool-page hero series (tvl/volume/fees/utilization/apy) folded from daily stats. */
export const getPoolHeroSeries = query({
  args: { slug: v.string(), metric: poolHeroMetric, range: rangeValidator },
  handler: async (ctx, { slug, metric, range }) => {
    const market = await resolveMarket(ctx, "pool", slug)
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
              : "supplyApyPct"
    const points = rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) }))
    const delta = await liveMarketDelta(ctx, market.slug)
    const deltaUsd = metric === "tvl" ? delta.suppliedDeltaUsd : 0
    return {
      id: `${market._id}:hero:${metric}:${range}`,
      label: metric,
      points: withLiveTip(points, deltaUsd),
    }
  },
})

const lendHeroMetric = v.union(v.literal("supply"), v.literal("utilization"), v.literal("apy"))

/** Lend-page hero series (supply / utilization / apy) folded from daily stats. */
export const getLendHeroSeries = query({
  args: { slug: v.string(), metric: lendHeroMetric, range: rangeValidator },
  handler: async (ctx, { slug, metric, range }) => {
    const market = await resolveMarket(ctx, "lend", slug)
    if (!market) return null
    const rows = await dailyRows(ctx, market._id, range)
    const field = metric === "supply" ? "suppliedUsd" : metric === "utilization" ? "utilizationPct" : "supplyApyPct"
    const points = rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) }))
    const delta = await liveMarketDelta(ctx, market.slug)
    const deltaUsd = metric === "supply" ? delta.suppliedDeltaUsd : 0
    return {
      id: `${market._id}:hero:${metric}:${range}`,
      label: metric,
      points: withLiveTip(points, deltaUsd),
    }
  },
})

const multiplyHeroMetric = v.union(v.literal("supply"), v.literal("utilization"), v.literal("apy"))

/** Multiply-page hero series (TVL / utilization / apy) folded from daily stats. */
export const getMultiplyHeroSeries = query({
  args: { slug: v.string(), metric: multiplyHeroMetric, range: rangeValidator },
  handler: async (ctx, { slug, metric, range }) => {
    const market = await resolveMarket(ctx, "multiply", slug)
    if (!market) return null
    const rows = await dailyRows(ctx, market._id, range)
    const field = metric === "supply" ? "suppliedUsd" : metric === "utilization" ? "utilizationPct" : "supplyApyPct"
    const points = rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) }))
    const delta = await liveMarketDelta(ctx, market.slug)
    const deltaUsd = metric === "supply" ? delta.suppliedDeltaUsd : 0
    return {
      id: `${market._id}:hero:${metric}:${range}`,
      label: metric,
      points: withLiveTip(points, deltaUsd),
    }
  },
})

/**
 * Recent wallet transactions for a market's detail-page history card. Reads
 * walletEvents (the engagement source) so the history is real, not random mock.
 * Returns shape: `TxHistoryRow[]` (app/lib/borrow-detail/types.ts).
 */
export const getRecentTransactions = query({
  args: { scope: v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"), v.literal("multiply")), slug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { scope, slug, limit }) => {
    const market = await resolveMarket(ctx, scope, slug)
    if (!market) return []
    const rows = await ctx.db
      .query("walletEvents")
      .withIndex("by_market_at", (q) => q.eq("marketId", market._id))
      .order("desc")
      .take(limit ?? 12)
    return rows.map((r) => ({
      id: String(r._id),
      at: new Date(r.at).toISOString(),
      kind: r.kind === "rewardsClaim" ? ("rewards" as const) : (r.kind as "supply" | "withdraw" | "borrow" | "repay" | "liquidation"),
      amountLabel: formatCompactUsd(r.amountUsd),
      walletLabel: `${r.wallet.slice(0, 6)}…${r.wallet.slice(-4)}`,
      counterpartyLabel: r.counterparty ? `${r.counterparty.slice(0, 6)}…${r.counterparty.slice(-4)}` : undefined,
      txHashShort: r.txHash.slice(0, 10),
    }))
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

async function resolveMarket(ctx: QueryCtx, scope: "asset" | "pool" | "lend" | "multiply", slug: string) {
  return ctx.db
    .query("markets")
    .withIndex("by_scope_slug", (q) => q.eq("scope", scope).eq("slug", slug))
    .unique()
}

/** Discriminator for the single liquidity-deltas cache row (see `convex/liquidity.ts`). */
const DELTAS_SINGLETON = "deltas"

/**
 * Net live supplied/borrowed delta for a market slug, folded from the shared liquidity
 * ledger (`marketLiquidityDeltas` → `liquidityDeltasCache`). This is the same aggregate
 * every supply/borrow/withdraw/repay writes to, so it lets a chart's latest point track
 * real cross-wallet activity instead of freezing at the seeded history.
 */
async function liveMarketDelta(ctx: QueryCtx, marketSlug: string) {
  const cacheRows = await ctx.db
    .query("liquidityDeltasCache")
    .withIndex("by_singleton", (q) => q.eq("singleton", DELTAS_SINGLETON))
    .collect()
  const canonical = cacheRows.length ? cacheRows.reduce((a, b) => (b.updatedAt >= a.updatedAt ? b : a)) : null
  const row = canonical?.rows.find((r) => r.marketSlug === marketSlug)
  return { suppliedDeltaUsd: row?.suppliedDeltaUsd ?? 0, borrowedDeltaUsd: row?.borrowedDeltaUsd ?? 0 }
}

/**
 * Add the net live delta to the most-recent series point so the chart tip (and the
 * headline derived from it) moves with aggregate activity in real time. The seeded
 * history is the starting point; recorded days are never rewritten.
 */
function withLiveTip(points: Array<{ t: string; v: number }>, deltaUsd: number) {
  if (deltaUsd === 0 || points.length === 0) return points
  const next = points.slice()
  const tip = next[next.length - 1]
  next[next.length - 1] = { t: tip.t, v: Math.max(0, tip.v + deltaUsd) }
  return next
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
