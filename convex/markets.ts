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
 * Prefer product-siloed `*DailyStats` tables; fall back to legacy
 * `marketDailyStats` keyed by `markets` id. The UI keeps a single
 * `Series` / `Point` shape; this file is the only place that knows the
 * Convex column names.
 */

import { v } from "convex/values"
import { internalMutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import { foldDeltas } from "./liquidity"

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
type MarketScope = "asset" | "pool" | "lend" | "multiply"

/** Shared numeric fields across legacy + siloed daily stats rows. */
type DailyStatAmounts = {
  day: string
  suppliedUsd: number
  borrowedUsd: number
  utilizationPct: number
  supplyApyPct: number
  borrowAprPct: number
  tvlUsd: number
  volumeUsd: number
  feesUsd: number
  priceUsd?: number
  supplyCapUsd?: number
  borrowCapUsd?: number
}

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
    const rows = await dailyRowsForScope(ctx, "asset", slug, "1Y")
    if (rows.length === 0) return null
    const market = await resolveMarket(ctx, "asset", slug)
    return {
      id: `${market?._id ?? slug}:historical-utilization`,
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
    const rows = await dailyRowsForScope(ctx, "asset", slug, "1Y")
    if (rows.length === 0) return null
    const market = await resolveMarket(ctx, "asset", slug)
    const prefix = market?._id ?? slug
    const mk = (field: keyof DailyStatAmounts, id: string, label: string) => ({
      id,
      label,
      points: rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) })),
    })
    return {
      supplied: mk("suppliedUsd", `${prefix}:sb:supplied`, "Supplied"),
      borrowed: mk("borrowedUsd", `${prefix}:sb:borrowed`, "Borrowed"),
      utilization: mk("utilizationPct", `${prefix}:sb:utilization`, "Utilization"),
    }
  },
})

/**
 * Multiply variant of getSupplyBorrow — same shape as the asset version but
 * reads scope="multiply". Multiply detail's MarketHero metric tabs currently
 * fall back to a PRNG mock (`buildSupplyBorrow` in multiply-detail/index.ts).
 * Wiring this in Phase E removes that fallback.
 */
export const getMultiplySupplyBorrow = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const rows = await dailyRowsForScope(ctx, "multiply", slug, "1Y")
    if (rows.length === 0) return null
    const market = await resolveMarket(ctx, "multiply", slug)
    const prefix = market?._id ?? slug
    const mk = (field: keyof DailyStatAmounts, id: string, label: string) => ({
      id,
      label,
      points: rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) })),
    })
    return {
      supplied: mk("suppliedUsd", `${prefix}:sb:supplied`, "Supplied"),
      borrowed: mk("borrowedUsd", `${prefix}:sb:borrowed`, "Borrowed"),
      utilization: mk("utilizationPct", `${prefix}:sb:utilization`, "Utilization"),
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
    const rows = await dailyRowsForScope(ctx, scope, slug, "1W")
    const latest = rows[rows.length - 1]
    const prev = rows[rows.length - 2]
    if (!latest) {
      const market = await resolveMarket(ctx, scope, slug)
      return market ? [] : null
    }
    const delta = await liveMarketDelta(ctx, slug)
    const suppliedUsd = Math.max(0, latest.suppliedUsd + delta.suppliedDeltaUsd)
    const borrowedUsd = Math.max(0, latest.borrowedUsd + delta.borrowedDeltaUsd)
    const availableUsd = Math.max(0, suppliedUsd - borrowedUsd)
    const prevAvailableUsd =
      prev !== undefined ? Math.max(0, (prev.suppliedUsd ?? 0) - (prev.borrowedUsd ?? 0)) : undefined
    const utilizationPct = suppliedUsd > 0 ? Math.min(100, (borrowedUsd / suppliedUsd) * 100) : 0
    const pct = (curr: number, old?: number) => (!old ? 0 : Math.round(((curr - old) / old) * 1000) / 10)
    const identity = await loadSiloedMarketIdentity(ctx, scope, slug)
    const reserveFactorPct = identity?.reserveFactorPct
    const stats: Array<{ id: string; label: string; value: string; delta: ReturnType<typeof toDelta> }> = [
      {
        id: "supplied",
        label: scope === "pool" ? "TVL" : "Total Supplied",
        value: formatCompactUsd(suppliedUsd),
        delta: toDelta(pct(suppliedUsd, prev?.suppliedUsd)),
      },
      {
        id: "borrowed",
        label: "Total Borrowed",
        value: formatCompactUsd(borrowedUsd),
        delta: toDelta(pct(borrowedUsd, prev?.borrowedUsd)),
      },
      {
        id: "available",
        label: "Available Liquidity",
        value: formatCompactUsd(availableUsd),
        delta: toDelta(pct(availableUsd, prevAvailableUsd)),
      },
      {
        id: "utilization",
        label: "Utilization",
        value: `${utilizationPct.toFixed(2)}%`,
        delta: toDelta(pct(utilizationPct, prev?.utilizationPct)),
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
    if (reserveFactorPct !== undefined && reserveFactorPct !== null) {
      stats.push({
        id: "reserveFactor",
        label: "Reserve Factor",
        value: `${Math.round(reserveFactorPct)}%`,
        delta: toDelta(0),
      })
    }
    return stats
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
      if (
        market.scope !== "pool" &&
        market.scope !== "asset" &&
        market.scope !== "lend" &&
        market.scope !== "multiply"
      ) {
        return null
      }
      const latest = await latestDailyStatForScope(ctx, market.scope, market.slug, market._id)
      if (!latest) return null
      const identity = (await loadSiloedMarketIdentity(ctx, market.scope, market.slug)) ?? market
      const premiumBps = await loadSiloedPremiumBps(ctx, market.scope, market.slug)
      return {
        slug: market.slug,
        scope: market.scope,
        name: identity.name,
        symbol: identity.symbol,
        chainId: identity.chainId,
        venueLabel: identity.venueLabel,
        category: identity.category,
        description: identity.description,
        iconUrl: identity.iconUrl,
        spokeId: identity.spokeId,
        feeTier: identity.feeTier,
        maxLtvPct: identity.maxLtvPct,
        reserveFactorPct: identity.reserveFactorPct,
        rewardsApyPct: identity.rewardsApyPct,
        premiumBps: premiumBps ?? undefined,
        visuals: identity.visuals,
        resources: identity.resources,
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

async function loadSiloedPremiumBps(ctx: QueryCtx | MutationCtx, scope: MarketScope, slug: string) {
  if (scope === "lend") {
    const row = await ctx.db
      .query("lendRiskAssessments")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    return row?.premiumBps
  }
  if (scope === "multiply") {
    const row = await ctx.db
      .query("multiplyRiskAssessments")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    return row?.premiumBps
  }
  const row = await ctx.db
    .query("borrowRiskAssessments")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
  return row?.premiumBps
}

async function loadSiloedMarketIdentity(ctx: QueryCtx | MutationCtx, scope: MarketScope, slug: string) {
  if (scope === "lend") {
    return ctx.db
      .query("lendMarkets")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
  }
  if (scope === "multiply") {
    return ctx.db
      .query("multiplyMarkets")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
  }
  return ctx.db
    .query("borrowMarkets")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
}

/**
 * Latest-day reference snapshot for every market. Subscribed app-wide, so it reads
 * the single precomputed `marketSnapshotsCache` document (O(1) reads) instead of
 * recomputing from ~173 per-market reads on every subscriber recompute. Powers the
 * borrow list/Explore cards and the session market-data hydration so every surface
 * reads the same Convex numbers. Keyed by the market `slug` (pool id, or
 * spoke-scoped asset id) for a direct lookup against the catalog.
 *
 * Live overlay: each row's economics are `dailyTip + folded liquidity delta` so
 * landings move with user activity without waiting for end-of-day rollup.
 *
 * Cold-cache fallback: if the cache has not been built yet (fresh deploy, before
 * the first `rebuildMarketSnapshots`), fall back to the recompute so the app still
 * hydrates. Steady state never hits that path.
 */
export const listMarketSnapshots = query({
  args: {},
  handler: async (ctx) => listMarketSnapshotRows(ctx),
})

/** Borrow landing/detail reference rows only (`pool` + `asset`). */
export const listBorrowMarketSnapshots = query({
  args: {},
  handler: async (ctx) => {
    const rows = await listMarketSnapshotRows(ctx)
    return rows.filter((row) => row.scope === "pool" || row.scope === "asset")
  },
})

/** Lend landing/detail reference rows only. */
export const listLendMarketSnapshots = query({
  args: {},
  handler: async (ctx) => {
    const rows = await listMarketSnapshotRows(ctx)
    return rows.filter((row) => row.scope === "lend")
  },
})

/** Multiply landing/detail reference rows only. */
export const listMultiplyMarketSnapshots = query({
  args: {},
  handler: async (ctx) => {
    const rows = await listMarketSnapshotRows(ctx)
    return rows.filter((row) => row.scope === "multiply")
  },
})

async function listMarketSnapshotRows(ctx: QueryCtx) {
  const cache = await ctx.db
    .query("marketSnapshotsCache")
    .withIndex("by_singleton", (q) => q.eq("singleton", SNAPSHOTS_SINGLETON))
    .unique()
  const rows = cache ? cache.rows : await computeMarketSnapshots(ctx)
  return withLiveLiquidityDeltas(ctx, rows)
}

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

/**
 * Daily aggregator: flush the running liquidity delta into a persistent daily
 * snapshot so the chart series lengthens over calendar time with REAL activity —
 * the seed is just the starting history.
 *
 * For each market it folds the net supply/borrow delta accumulated since the last
 * flush, writes (or patches) today's `marketDailyStats` row to the resulting
 * absolute value, then appends a counter-delta that rebases the ledger to zero.
 * That keeps the invariant every consumer relies on — `latest daily row + current
 * folded delta = live value` — unchanged: before the flush it's `prevRow + D`,
 * after it's `(prevRow + D) + 0`. No double count, no schema change, and the
 * read-path tip overlay keeps working (it just adds ~0 right after a flush and the
 * fresh intraday delta between flushes). Idempotent within a day: a second run the
 * same day patches today's row and counters only the delta since the first run.
 *
 * Runs in one transaction (≈ #markets reads/writes, well within Convex limits) and
 * schedules the shared-cache rebuilds so every surface immediately reads the
 * flushed snapshot + zeroed delta.
 */
export const rollupDailyStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10)
    const now = Date.now()

    const deltaBySlug = new Map<string, { supplied: number; borrowed: number }>()
    for (const d of await foldDeltas(ctx)) {
      deltaBySlug.set(d.marketSlug, { supplied: d.suppliedDeltaUsd, borrowed: d.borrowedDeltaUsd })
    }

    const markets = await ctx.db.query("markets").collect()
    let written = 0
    let rebased = 0
    for (const market of markets) {
      if (
        market.scope !== "pool" &&
        market.scope !== "asset" &&
        market.scope !== "lend" &&
        market.scope !== "multiply"
      ) {
        continue
      }
      const latest = await latestDailyStatForScope(ctx, market.scope, market.slug, market._id)
      if (!latest) continue

      const d = deltaBySlug.get(market.slug) ?? { supplied: 0, borrowed: 0 }
      const suppliedUsd = Math.max(0, latest.suppliedUsd + d.supplied)
      const borrowedUsd = Math.max(0, latest.borrowedUsd + d.borrowed)
      const utilizationPct = suppliedUsd > 0 ? Math.min(100, (borrowedUsd / suppliedUsd) * 100) : 0
      const tvlUsd = market.scope === "pool" ? suppliedUsd : Math.max(0, latest.tvlUsd + d.supplied)
      const snapshot = {
        suppliedUsd,
        borrowedUsd,
        utilizationPct,
        supplyApyPct: latest.supplyApyPct,
        borrowAprPct: latest.borrowAprPct,
        tvlUsd,
        volumeUsd: latest.volumeUsd,
        feesUsd: latest.feesUsd,
        priceUsd: latest.priceUsd,
        supplyCapUsd: latest.supplyCapUsd,
        borrowCapUsd: latest.borrowCapUsd,
      }

      const legacyLatest = await ctx.db
        .query("marketDailyStats")
        .withIndex("by_market_day", (q) => q.eq("marketId", market._id))
        .order("desc")
        .first()
      if (legacyLatest?.day === today) await ctx.db.patch(legacyLatest._id, snapshot)
      else await ctx.db.insert("marketDailyStats", { marketId: market._id, day: today, ...snapshot })

      await upsertSiloedDailyStat(ctx, market.scope, market.slug, today, snapshot)
      written++

      // Rebase the running ledger to zero for this market: the delta is now baked into
      // the persisted daily row, so the accumulator restarts from the fresh snapshot.
      if (d.supplied !== 0 || d.borrowed !== 0) {
        await ctx.db.insert("marketLiquidityDeltas", {
          marketSlug: market.slug,
          borrowedDeltaUsd: -d.borrowed,
          suppliedDeltaUsd: -d.supplied,
          updatedAt: now,
        })
        rebased++
      }
    }

    // Refresh the shared caches so every surface reads the flushed snapshot + zeroed
    // delta right away instead of waiting for the 5-minute rebuild crons.
    await ctx.scheduler.runAfter(0, internal.liquidity.rebuildDeltaSnapshot, {})
    await ctx.scheduler.runAfter(0, internal.markets.rebuildMarketSnapshots, {})

    return { day: today, written, rebased }
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
    const rows = await dailyRowsForScope(ctx, "asset", slug, range)
    if (rows.length === 0) return null
    const market = await resolveMarket(ctx, "asset", slug)
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
    const delta = await liveMarketDelta(ctx, slug)
    const deltaUsd = metric === "supply" ? delta.suppliedDeltaUsd : metric === "borrow" ? delta.borrowedDeltaUsd : 0
    return {
      id: `${market?._id ?? slug}:hero:${metric}:${range}`,
      label: metric,
      points: withLiveTip(points, deltaUsd),
    }
  },
})

const poolHeroMetric = v.union(
  v.literal("tvl"),
  v.literal("borrowed"),
  v.literal("volume"),
  v.literal("fees"),
  v.literal("utilization"),
  v.literal("apy"),
)

/** Pool-page hero series (tvl/borrowed/volume/fees/utilization/apy) folded from daily stats. */
export const getPoolHeroSeries = query({
  args: { slug: v.string(), metric: poolHeroMetric, range: rangeValidator },
  handler: async (ctx, { slug, metric, range }) => {
    const rows = await dailyRowsForScope(ctx, "pool", slug, range)
    if (rows.length === 0) return null
    const market = await resolveMarket(ctx, "pool", slug)
    const field =
      metric === "tvl"
        ? "tvlUsd"
        : metric === "borrowed"
          ? "borrowedUsd"
          : metric === "volume"
            ? "volumeUsd"
            : metric === "fees"
              ? "feesUsd"
              : metric === "utilization"
                ? "utilizationPct"
                : "supplyApyPct"
    const points = rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) }))
    const delta = await liveMarketDelta(ctx, slug)
    const deltaUsd = metric === "tvl" ? delta.suppliedDeltaUsd : metric === "borrowed" ? delta.borrowedDeltaUsd : 0
    return {
      id: `${market?._id ?? slug}:hero:${metric}:${range}`,
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
    const rows = await dailyRowsForScope(ctx, "lend", slug, range)
    if (rows.length === 0) return null
    const market = await resolveMarket(ctx, "lend", slug)
    const field = metric === "supply" ? "suppliedUsd" : metric === "utilization" ? "utilizationPct" : "supplyApyPct"
    const points = rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) }))
    const delta = await liveMarketDelta(ctx, slug)
    const deltaUsd = metric === "supply" ? delta.suppliedDeltaUsd : 0
    return {
      id: `${market?._id ?? slug}:hero:${metric}:${range}`,
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
    const rows = await dailyRowsForScope(ctx, "multiply", slug, range)
    if (rows.length === 0) return null
    const market = await resolveMarket(ctx, "multiply", slug)
    const field = metric === "supply" ? "suppliedUsd" : metric === "utilization" ? "utilizationPct" : "supplyApyPct"
    const points = rows.map((r) => ({ t: r.day, v: Number(r[field] ?? 0) }))
    const delta = await liveMarketDelta(ctx, slug)
    const deltaUsd = metric === "supply" ? delta.suppliedDeltaUsd : 0
    return {
      id: `${market?._id ?? slug}:hero:${metric}:${range}`,
      label: metric,
      points: withLiveTip(points, deltaUsd),
    }
  },
})

/**
 * Recent transactions for a market's detail-page history card.
 * Prefers live sandbox `transactions` for this marketSlug (user activity).
 * Falls back to seeded `walletEvents` when no sandbox rows exist yet.
 * Returns shape: `TxHistoryRow[]` (app/lib/borrow-detail/types.ts).
 */
export const getRecentTransactions = query({
  args: {
    scope: v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"), v.literal("multiply")),
    slug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { scope, slug, limit }) => {
    const take = limit ?? 12
    const sandboxRows = await ctx.db
      .query("transactions")
      .withIndex("by_market_at", (q) => q.eq("marketSlug", slug))
      .order("desc")
      .take(take * 2)
    const live = sandboxRows
      .filter((r) => r.status === "success" && r.marketSlug === slug)
      .slice(0, take)
      .map((r) => ({
        id: String(r._id),
        at: new Date(r.at).toISOString(),
        kind: mapSandboxTxKind(r.kind),
        amountLabel: formatCompactUsd(r.amountUsd),
        walletLabel: `${r.wallet.slice(0, 6)}…${r.wallet.slice(-4)}`,
        counterpartyLabel: undefined as string | undefined,
        txHashShort: r.syntheticTxHash.slice(0, 10),
        source: "sandbox" as const,
      }))
    if (live.length > 0) return live

    const market = await resolveMarket(ctx, scope, slug)
    if (!market) return []
    const rows = await ctx.db
      .query("walletEvents")
      .withIndex("by_market_at", (q) => q.eq("marketId", market._id))
      .order("desc")
      .take(take)
    return rows.map((r) => ({
      id: String(r._id),
      at: new Date(r.at).toISOString(),
      kind:
        r.kind === "rewardsClaim"
          ? ("rewards" as const)
          : (r.kind as "supply" | "withdraw" | "borrow" | "repay" | "liquidation"),
      amountLabel: formatCompactUsd(r.amountUsd),
      walletLabel: `${r.wallet.slice(0, 6)}…${r.wallet.slice(-4)}`,
      counterpartyLabel: r.counterparty ? `${r.counterparty.slice(0, 6)}…${r.counterparty.slice(-4)}` : undefined,
      txHashShort: r.txHash.slice(0, 10),
      source: "seed" as const,
    }))
  },
})

function mapSandboxTxKind(kind: string): "supply" | "withdraw" | "borrow" | "repay" | "liquidation" | "rewards" {
  if (kind === "deposit") return "supply"
  if (kind === "withdraw") return "withdraw"
  if (kind === "borrow" || kind === "multiply") return "borrow"
  if (kind === "repay" || kind === "deleverage" || kind === "close") return "repay"
  if (kind === "claim") return "rewards"
  if (kind === "liquidate" || kind === "liquidation") return "liquidation"
  return "supply"
}

async function dailyRows(ctx: QueryCtx, marketId: Id<"markets">, range: RangeId): Promise<DailyStatAmounts[]> {
  const days = RANGE_DAYS[range]
  const start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
  const rows = await ctx.db
    .query("marketDailyStats")
    .withIndex("by_market_day", (q) => q.eq("marketId", marketId).gte("day", start))
    .order("asc")
    .collect()
  return rows.map(toDailyStatAmounts)
}

/** Prefer product-siloed daily stats by slug; fall back to legacy marketDailyStats. */
async function dailyRowsForScope(
  ctx: QueryCtx,
  scope: MarketScope,
  slug: string,
  range: RangeId,
): Promise<DailyStatAmounts[]> {
  const days = RANGE_DAYS[range]
  const start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
  const siloed = await loadSiloedDailyRows(ctx, scope, slug, start)
  if (siloed.length > 0) return siloed

  const market = await resolveMarket(ctx, scope, slug)
  if (!market) return []
  return dailyRows(ctx, market._id, range)
}

async function loadSiloedDailyRows(
  ctx: QueryCtx | MutationCtx,
  scope: MarketScope,
  slug: string,
  startDay: string,
): Promise<DailyStatAmounts[]> {
  if (scope === "lend") {
    const rows = await ctx.db
      .query("lendDailyStats")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug).gte("day", startDay))
      .order("asc")
      .collect()
    return rows.map(toDailyStatAmounts)
  }
  if (scope === "multiply") {
    const rows = await ctx.db
      .query("multiplyDailyStats")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug).gte("day", startDay))
      .order("asc")
      .collect()
    return rows.map(toDailyStatAmounts)
  }
  const rows = await ctx.db
    .query("borrowDailyStats")
    .withIndex("by_slug_day", (q) => q.eq("slug", slug).gte("day", startDay))
    .order("asc")
    .collect()
  return rows.map(toDailyStatAmounts)
}

async function latestDailyStatForScope(
  ctx: QueryCtx | MutationCtx,
  scope: MarketScope,
  slug: string,
  marketId?: Id<"markets">,
): Promise<DailyStatAmounts | null> {
  if (scope === "lend") {
    const siloed = await ctx.db
      .query("lendDailyStats")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug))
      .order("desc")
      .first()
    if (siloed) return toDailyStatAmounts(siloed)
  } else if (scope === "multiply") {
    const siloed = await ctx.db
      .query("multiplyDailyStats")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug))
      .order("desc")
      .first()
    if (siloed) return toDailyStatAmounts(siloed)
  } else {
    const siloed = await ctx.db
      .query("borrowDailyStats")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug))
      .order("desc")
      .first()
    if (siloed) return toDailyStatAmounts(siloed)
  }

  if (!marketId) return null
  const legacy = await ctx.db
    .query("marketDailyStats")
    .withIndex("by_market_day", (q) => q.eq("marketId", marketId))
    .order("desc")
    .first()
  return legacy ? toDailyStatAmounts(legacy) : null
}

async function upsertSiloedDailyStat(
  ctx: MutationCtx,
  scope: MarketScope,
  slug: string,
  day: string,
  snapshot: Omit<DailyStatAmounts, "day">,
) {
  if (scope === "lend") {
    const row = { slug, day, ...snapshot }
    const existing = await ctx.db
      .query("lendDailyStats")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug).eq("day", day))
      .unique()
    if (existing) await ctx.db.patch(existing._id, row)
    else await ctx.db.insert("lendDailyStats", row)
    return
  }
  if (scope === "multiply") {
    const row = { slug, day, ...snapshot }
    const existing = await ctx.db
      .query("multiplyDailyStats")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug).eq("day", day))
      .unique()
    if (existing) await ctx.db.patch(existing._id, row)
    else await ctx.db.insert("multiplyDailyStats", row)
    return
  }
  const row = { slug, kind: scope, day, ...snapshot }
  const existing = await ctx.db
    .query("borrowDailyStats")
    .withIndex("by_slug_day", (q) => q.eq("slug", slug).eq("day", day))
    .unique()
  if (existing) await ctx.db.patch(existing._id, row)
  else await ctx.db.insert("borrowDailyStats", row)
}

function toDailyStatAmounts(row: {
  day: string
  suppliedUsd: number
  borrowedUsd: number
  utilizationPct: number
  supplyApyPct: number
  borrowAprPct: number
  tvlUsd: number
  volumeUsd: number
  feesUsd: number
  priceUsd?: number
  supplyCapUsd?: number
  borrowCapUsd?: number
}): DailyStatAmounts {
  return {
    day: row.day,
    suppliedUsd: row.suppliedUsd,
    borrowedUsd: row.borrowedUsd,
    utilizationPct: row.utilizationPct,
    supplyApyPct: row.supplyApyPct,
    borrowAprPct: row.borrowAprPct,
    tvlUsd: row.tvlUsd,
    volumeUsd: row.volumeUsd,
    feesUsd: row.feesUsd,
    priceUsd: row.priceUsd,
    supplyCapUsd: row.supplyCapUsd,
    borrowCapUsd: row.borrowCapUsd,
  }
}

async function resolveMarket(ctx: QueryCtx, scope: MarketScope, slug: string) {
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
/**
 * Full folded delta set, cache-first: read the precomputed `liquidityDeltasCache`
 * singleton (rebuilt on a schedule) and fold the raw ledger only on a cold cache.
 * The list-snapshot and quickStats read paths run on every page; folding the raw
 * baseline + delta tables on each call was two full-table scans per read, even
 * though this cache exists for exactly that reason. The scheduled aggregator
 * (`rollupDailyStats`) still folds directly — it rebuilds the cache, so it must read
 * the true current ledger, not the value it is about to overwrite.
 */
async function foldedDeltasCacheFirst(ctx: QueryCtx): Promise<Awaited<ReturnType<typeof foldDeltas>>> {
  const cacheRows = await ctx.db
    .query("liquidityDeltasCache")
    .withIndex("by_singleton", (q) => q.eq("singleton", DELTAS_SINGLETON))
    .collect()
  const canonical = cacheRows.length ? cacheRows.reduce((a, b) => (b.updatedAt >= a.updatedAt ? b : a)) : null
  return canonical ? canonical.rows : foldDeltas(ctx)
}

async function liveMarketDelta(ctx: QueryCtx, marketSlug: string) {
  const folded = await foldedDeltasCacheFirst(ctx)
  const row = folded.find((r) => r.marketSlug === marketSlug)
  return { suppliedDeltaUsd: row?.suppliedDeltaUsd ?? 0, borrowedDeltaUsd: row?.borrowedDeltaUsd ?? 0 }
}

type SnapshotRow = {
  slug: string
  suppliedUsd: number
  borrowedUsd: number
  availableUsd: number
  utilizationPct: number
  tvlUsd: number
  [key: string]: unknown
}

/** Overlay folded liquidity deltas onto cached/computed snapshot tips (tip + delta = live). */
async function withLiveLiquidityDeltas<T extends SnapshotRow>(ctx: QueryCtx, rows: T[]): Promise<T[]> {
  const folded = await foldedDeltasCacheFirst(ctx)
  if (folded.length === 0) return rows
  const bySlug = new Map(folded.map((d) => [d.marketSlug, d]))
  let changed = false
  const next = rows.map((row) => {
    const delta = bySlug.get(row.slug)
    if (!delta || (delta.suppliedDeltaUsd === 0 && delta.borrowedDeltaUsd === 0)) return row
    changed = true
    const suppliedUsd = Math.max(0, row.suppliedUsd + delta.suppliedDeltaUsd)
    const borrowedUsd = Math.max(0, row.borrowedUsd + delta.borrowedDeltaUsd)
    const availableUsd = Math.max(0, suppliedUsd - borrowedUsd)
    const utilizationPct = suppliedUsd > 0 ? Math.min(100, (borrowedUsd / suppliedUsd) * 100) : 0
    const tvlUsd = Math.max(0, row.tvlUsd + delta.suppliedDeltaUsd)
    return { ...row, suppliedUsd, borrowedUsd, availableUsd, utilizationPct, tvlUsd }
  })
  return changed ? next : rows
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
