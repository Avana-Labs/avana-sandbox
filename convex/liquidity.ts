/**
 * Shared multi-user market liquidity ledger.
 *
 * Append-only writes to `marketLiquidityDeltas` keep every action on its OWN document so
 * concurrent writers never contend under Convex OCC. The app-wide subscription reads
 * `listDeltaSnapshot` — a single precomputed cache document.
 *
 * AGGREGATE UPDATES are action-triggered but COALESCED: an append queues at most one cache
 * rebuild per `SNAPSHOT_REBUILD_DEBOUNCE_MS` window (immediately when the cache is cold).
 * The cache document is read by every authenticated client, so writing it re-runs the
 * app-wide subscriptions for every connected session — debouncing bounds that fan-out by
 * the window instead of by write volume. The aggregate is eventually consistent within one
 * window; wallet-owned reads are unaffected. COMPACTION is scheduled only after the
 * un-compacted raw-row count crosses `COMPACTION_DIRTY_THRESHOLD`, so idle hours produce
 * zero liquidity jobs.
 *
 * BOUNDED FOLD (compaction). A naive `collect()` over the append table grows without bound.
 * Instead the fold is split in two:
 *   - `marketLiquidityBaseline` — one cumulative row per market, the sum of every
 *     already-compacted delta.
 *   - the raw `marketLiquidityDeltas` rows that have NOT yet been compacted.
 * `compactDeltas` folds the oldest raw rows into the baseline and deletes them, so the fold
 * input is `#markets + #recent-deltas`. Every row is counted exactly once.
 */

import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalMutation, query } from "./_generated/server"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { getAuthedWallet } from "./sandbox/auth"

/** Single cache row discriminator (see `liquidityDeltasCache` in schema.ts). */
const DELTAS_SINGLETON = "deltas"

/**
 * Max raw delta rows compacted into the baseline per `compactDeltas` run. Bounds the
 * compaction transaction's own read/write/delete set so a large backlog drains over several
 * runs instead of one oversized scan.
 */
const COMPACTION_BATCH = 4_096

/** Schedule compaction once the un-compacted raw table reaches this size. */
export const COMPACTION_DIRTY_THRESHOLD = 512

/**
 * Minimum spacing between `liquidityDeltasCache` rebuilds. Every rebuild re-runs the
 * app-wide liquidity subscriptions for every connected session, so this — not the append
 * rate — is what bounds that fan-out. Lower = fresher aggregates, more re-runs per session.
 */
export const SNAPSHOT_REBUILD_DEBOUNCE_MS = 5_000

type FoldedDelta = { marketSlug: string; borrowedDeltaUsd: number; suppliedDeltaUsd: number; updatedAt: number }

async function requireLiquidityReader(ctx: QueryCtx) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) {
    throw new Error("UNAUTHENTICATED: sign in to read live liquidity deltas.")
  }
}

/**
 * Fold the compacted baseline plus the un-compacted raw delta rows into one net aggregate
 * per market. Bounded by `#markets + #un-compacted rows`, not the total number of actions.
 */
export async function foldDeltas(ctx: QueryCtx | MutationCtx): Promise<FoldedDelta[]> {
  const byMarket = new Map<string, { borrowedDeltaUsd: number; suppliedDeltaUsd: number; updatedAt: number }>()

  const accumulate = (marketSlug: string, borrowedDeltaUsd: number, suppliedDeltaUsd: number, updatedAt: number) => {
    const acc = byMarket.get(marketSlug)
    if (acc) {
      acc.borrowedDeltaUsd += borrowedDeltaUsd
      acc.suppliedDeltaUsd += suppliedDeltaUsd
      acc.updatedAt = Math.max(acc.updatedAt, updatedAt)
    } else {
      byMarket.set(marketSlug, { borrowedDeltaUsd, suppliedDeltaUsd, updatedAt })
    }
  }

  const baselines = await ctx.db.query("marketLiquidityBaseline").collect()
  for (const row of baselines) accumulate(row.marketSlug, row.borrowedDeltaUsd, row.suppliedDeltaUsd, row.updatedAt)

  const rows = await ctx.db.query("marketLiquidityDeltas").collect()
  for (const row of rows) accumulate(row.marketSlug, row.borrowedDeltaUsd, row.suppliedDeltaUsd, row.updatedAt)

  return Array.from(byMarket, ([marketSlug, net]) => ({ marketSlug, ...net }))
}

async function compactDeltaRows(ctx: MutationCtx): Promise<{ compacted: number; markets: number }> {
  const stale = await ctx.db.query("marketLiquidityDeltas").order("asc").take(COMPACTION_BATCH)
  if (stale.length === 0) return { compacted: 0, markets: 0 }

  const folded = new Map<string, { borrowedDeltaUsd: number; suppliedDeltaUsd: number; updatedAt: number }>()
  for (const row of stale) {
    const acc = folded.get(row.marketSlug)
    if (acc) {
      acc.borrowedDeltaUsd += row.borrowedDeltaUsd
      acc.suppliedDeltaUsd += row.suppliedDeltaUsd
      acc.updatedAt = Math.max(acc.updatedAt, row.updatedAt)
    } else {
      folded.set(row.marketSlug, {
        borrowedDeltaUsd: row.borrowedDeltaUsd,
        suppliedDeltaUsd: row.suppliedDeltaUsd,
        updatedAt: row.updatedAt,
      })
    }
  }

  for (const [marketSlug, net] of folded) {
    const existing = await ctx.db
      .query("marketLiquidityBaseline")
      .withIndex("by_slug", (q) => q.eq("marketSlug", marketSlug))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        borrowedDeltaUsd: existing.borrowedDeltaUsd + net.borrowedDeltaUsd,
        suppliedDeltaUsd: existing.suppliedDeltaUsd + net.suppliedDeltaUsd,
        updatedAt: Math.max(existing.updatedAt, net.updatedAt),
      })
    } else {
      await ctx.db.insert("marketLiquidityBaseline", { marketSlug, ...net })
    }
  }

  for (const row of stale) await ctx.db.delete(row._id)

  return { compacted: stale.length, markets: folded.size }
}

async function readDeltaSnapshotRows(ctx: QueryCtx | MutationCtx) {
  return ctx.db
    .query("liquidityDeltasCache")
    .withIndex("by_singleton", (q) => q.eq("singleton", DELTAS_SINGLETON))
    .collect()
}

function selectCanonicalSnapshot<T extends { updatedAt: number }>(rows: T[]) {
  if (rows.length === 0) return null
  return rows.reduce((latest, row) => (row.updatedAt >= latest.updatedAt ? row : latest))
}

async function readRebuildState(ctx: MutationCtx) {
  return ctx.db
    .query("liquidityRebuildState")
    .withIndex("by_singleton", (q) => q.eq("singleton", DELTAS_SINGLETON))
    .unique()
}

/** Record when the queued rebuild is due (0 clears the marker). */
async function markRebuildScheduled(ctx: MutationCtx, scheduledFor: number) {
  const state = await readRebuildState(ctx)
  if (state) await ctx.db.patch(state._id, { scheduledFor })
  else await ctx.db.insert("liquidityRebuildState", { singleton: DELTAS_SINGLETON, scheduledFor })
}

/**
 * Queue at most ONE aggregate rebuild per debounce window.
 *
 * `liquidityDeltasCache` is read by every authenticated client — directly via
 * `listDeltaSnapshot`, and again via `markets.listMarketSnapshots`'s live-delta overlay.
 * Writing it therefore re-runs both subscriptions for every connected session, so the old
 * write-inline-on-every-append path made one wallet's action invalidate every other
 * subscriber: re-run volume scaled with (appends × concurrent sessions). Coalescing bounds
 * it by the window instead, independent of write volume.
 *
 * The raw append stays immediate and contention-free; only the aggregate is eventually
 * consistent, within one window. Wallet-owned reads (positions, balances, portfolio) are
 * untouched and still update instantly.
 */
async function scheduleSnapshotRebuild(ctx: MutationCtx, now: number) {
  const state = await readRebuildState(ctx)
  if (state && state.scheduledFor > now) return // a rebuild is already queued for this window

  // Cold cache: every reader is folding raw events until the first build lands, so leave
  // that state at once rather than waiting out the window.
  const cold = selectCanonicalSnapshot(await readDeltaSnapshotRows(ctx)) === null
  const delay = cold ? 0 : SNAPSHOT_REBUILD_DEBOUNCE_MS

  await ctx.scheduler.runAfter(delay, internal.liquidity.rebuildDeltaSnapshot, {})
  // Mark a full window either way so a burst of appends cannot queue a rebuild each.
  await markRebuildScheduled(ctx, now + SNAPSHOT_REBUILD_DEBOUNCE_MS)
}

async function maybeScheduleCompaction(ctx: MutationCtx) {
  // take(threshold) is always `threshold` once we are at-or-above it, so peek one past
  // to detect the exact crossing write and avoid scheduling compaction on every subsequent
  // append while a drain is already queued.
  const sample = await ctx.db.query("marketLiquidityDeltas").take(COMPACTION_DIRTY_THRESHOLD + 1)
  if (sample.length !== COMPACTION_DIRTY_THRESHOLD) return
  await ctx.scheduler.runAfter(0, internal.liquidity.compactDeltas, {})
}

/**
 * Append a ledger delta, queue a coalesced aggregate rebuild, and schedule compaction past
 * the dirty threshold. Shared by wallet liquidation, internal recorders, and daily rollup
 * rebases.
 */
export async function appendLiquidityDelta(
  ctx: MutationCtx,
  args: { marketSlug: string; borrowedDeltaUsd: number; suppliedDeltaUsd: number; updatedAt?: number },
) {
  const borrowedDeltaUsd = Number.isFinite(args.borrowedDeltaUsd) ? args.borrowedDeltaUsd : 0
  const suppliedDeltaUsd = Number.isFinite(args.suppliedDeltaUsd) ? args.suppliedDeltaUsd : 0
  if (borrowedDeltaUsd === 0 && suppliedDeltaUsd === 0) return

  const updatedAt = args.updatedAt ?? Date.now()
  await ctx.db.insert("marketLiquidityDeltas", {
    marketSlug: args.marketSlug,
    borrowedDeltaUsd,
    suppliedDeltaUsd,
    updatedAt,
  })
  // Debounce off the wall clock, not `updatedAt` — rollup rebases backdate that.
  await scheduleSnapshotRebuild(ctx, Date.now())
  await maybeScheduleCompaction(ctx)
}

// Protocol / test recorder. Wallet product actions intentionally do not call this — they
// update wallet-owned buckets only. Liquidation and rollup use `appendLiquidityDelta`.
export const recordDelta = internalMutation({
  args: {
    marketSlug: v.string(),
    borrowedDeltaUsd: v.optional(v.number()),
    suppliedDeltaUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await appendLiquidityDelta(ctx, {
      marketSlug: args.marketSlug,
      borrowedDeltaUsd: Number.isFinite(args.borrowedDeltaUsd) ? (args.borrowedDeltaUsd as number) : 0,
      suppliedDeltaUsd: Number.isFinite(args.suppliedDeltaUsd) ? (args.suppliedDeltaUsd as number) : 0,
    })
  },
})

/**
 * Direct fold of the compacted baseline + un-compacted deltas. Do NOT use as the app-wide
 * subscription (use `listDeltaSnapshot`). Kept for rebuilds and ledger assertions.
 */
export const listDeltas = query({
  args: {},
  handler: async (ctx) => {
    await requireLiquidityReader(ctx)
    return foldDeltas(ctx)
  },
})

/**
 * App-wide liquidity subscription. Reads the precomputed `liquidityDeltasCache` document.
 * Cold-cache fallback folds raw events until the first action-triggered rebuild lands.
 */
export const listDeltaSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const cache = selectCanonicalSnapshot(await readDeltaSnapshotRows(ctx))
    if (cache) return cache.rows
    return foldDeltas(ctx)
  },
})

/** Rebuild the cache singleton from the bounded fold. Action-triggered / rollup only. */
export const rebuildDeltaSnapshot = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await foldDeltas(ctx)
    const existingRows = await readDeltaSnapshotRows(ctx)
    const canonical = selectCanonicalSnapshot(existingRows)
    const doc = { singleton: DELTAS_SINGLETON, rows, updatedAt: Date.now() }

    if (canonical) await ctx.db.replace(canonical._id, doc)
    else await ctx.db.insert("liquidityDeltasCache", doc)

    for (const row of existingRows) {
      if (row._id !== canonical?._id) {
        await ctx.db.delete(row._id)
      }
    }
    // Release the debounce so the next append can queue the following window.
    await markRebuildScheduled(ctx, 0)
    return { markets: rows.length }
  },
})

/**
 * Threshold-triggered compaction. Folds the OLDEST raw rows into per-market baselines and
 * deletes them. Idempotent on the total: `baseline + remaining raw` is invariant.
 */
export const compactDeltas = internalMutation({
  args: {},
  handler: async (ctx) => {
    const result = await compactDeltaRows(ctx)
    if (result.compacted > 0) {
      await ctx.scheduler.runAfter(0, internal.liquidity.rebuildDeltaSnapshot, {})
      const remaining = await ctx.db.query("marketLiquidityDeltas").take(COMPACTION_DIRTY_THRESHOLD)
      if (remaining.length >= COMPACTION_DIRTY_THRESHOLD) {
        await ctx.scheduler.runAfter(0, internal.liquidity.compactDeltas, {})
      }
    }
    return result
  },
})
