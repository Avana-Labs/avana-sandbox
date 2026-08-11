/**
 * Shared multi-user market liquidity ledger.
 *
 * Every borrow / repay / supply / withdraw APPENDS a delta event to
 * `marketLiquidityDeltas` (server-side, inside the validated recordTransaction). The
 * folded net-per-market layers onto the static catalog base, so a market's Total
 * Borrowed / Available / Utilization (and pool collateral / TVL) move with aggregate
 * activity across all users — instead of staying frozen.
 *
 * Append-only writes keep every action on its OWN document: patching one shared
 * per-market row put concurrent writers on the same doc and made them contend under
 * Convex OCC.
 *
 * BOUNDED FOLD (compaction). A naive `collect()` over the append table is a full-table
 * scan that grows without bound (every action is a row) — at scale it blows past Convex's
 * per-transaction document-scan limit. Instead the fold is split in two:
 *   - `marketLiquidityBaseline` — one cumulative row per market, the sum of every
 *     already-compacted delta.
 *   - the raw `marketLiquidityDeltas` rows that have NOT yet been compacted (a bounded
 *     recent window between compaction runs).
 * A scheduled `compactDeltas` (`crons.ts`) folds the oldest raw rows into the baseline
 * and deletes them, so the fold input is `#markets + #recent-deltas`, independent of the
 * total number of actions ever taken. Every row is counted exactly once: it is either
 * still raw (summed live) or folded into the baseline and deleted (summed via baseline),
 * never both.
 *
 * The app-wide subscription reads `listDeltaSnapshot` — a single precomputed cache
 * document rebuilt on a schedule (`crons.ts`) — NOT the raw event table. Subscribing
 * to the raw table meant one user's write invalidated every user's subscription and
 * re-folded the whole table per subscriber; the snapshot decouples the hot write path
 * from every reader, bounding cross-user staleness to the refresh interval.
 */

import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { getAuthedWallet } from "./sandbox/auth"

/** Single cache row discriminator (see `liquidityDeltasCache` in schema.ts). */
const DELTAS_SINGLETON = "deltas"

/**
 * Max raw delta rows compacted into the baseline per `compactDeltas` run. Bounds the
 * compaction transaction's own read/write/delete set (well under Convex's per-transaction
 * limits) so a large backlog drains over several runs instead of one oversized scan. The
 * scheduled cadence (`crons.ts`) keeps the un-compacted window — and thus the live fold
 * input — bounded to roughly `arrival rate × interval`.
 */
const COMPACTION_BATCH = 4_096

type FoldedDelta = { marketSlug: string; borrowedDeltaUsd: number; suppliedDeltaUsd: number; updatedAt: number }

async function requireLiquidityReader(ctx: QueryCtx) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) {
    throw new Error("UNAUTHENTICATED: sign in to read live liquidity deltas.")
  }
}

/**
 * Fold the compacted baseline plus the un-compacted raw delta rows into one net aggregate
 * per market. Bounded by `#markets + #un-compacted rows` (see the file header), not the
 * total number of actions — so it no longer scales with, or scans, the whole event table.
 *
 * A delta row is summed here (raw) until `compactDeltas` folds it into a baseline row and
 * deletes it, after which the baseline carries it — exactly-once either way.
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

  // Compacted history: one row per market.
  const baselines = await ctx.db.query("marketLiquidityBaseline").collect()
  for (const row of baselines) accumulate(row.marketSlug, row.borrowedDeltaUsd, row.suppliedDeltaUsd, row.updatedAt)

  // Recent, un-compacted events (bounded window between compaction runs).
  const rows = await ctx.db.query("marketLiquidityDeltas").collect()
  for (const row of rows) accumulate(row.marketSlug, row.borrowedDeltaUsd, row.suppliedDeltaUsd, row.updatedAt)

  return Array.from(byMarket, ([marketSlug, net]) => ({ marketSlug, ...net }))
}

/**
 * Fold up to `COMPACTION_BATCH` of the OLDEST raw delta rows into their per-market
 * baseline accumulators and delete the folded rows. Idempotent w.r.t. the total: each raw
 * row is added to the baseline exactly once and then removed, so `baseline + remaining
 * raw` is invariant across a run.
 *
 * Correctness under concurrency rests on delete-BY-ID, not ordering: a Convex mutation is
 * a serializable transaction, and we delete exactly the rows we folded in this same
 * transaction. A row appended by a concurrent `recordTransaction` either lands in this
 * batch (folded + deleted atomically) or after it (left for the next run) — never folded
 * without being deleted, nor deleted without being folded. The concurrent append only
 * inserts a NEW delta document and never touches the baseline, so it does not contend with
 * compaction on any document. Oldest-first (default `_creationTime` order) just keeps the
 * table draining from the front.
 */
async function compactDeltaRows(ctx: MutationCtx): Promise<{ compacted: number; markets: number }> {
  // Default order is by `_creationTime` — the per-document insertion time Convex maintains
  // — so `asc` + `take` reads the OLDEST rows first: a stable prefix we then fold and
  // delete by id. `take(COMPACTION_BATCH)` bounds the compaction transaction's own scan.
  const stale = await ctx.db.query("marketLiquidityDeltas").order("asc").take(COMPACTION_BATCH)
  if (stale.length === 0) return { compacted: 0, markets: 0 }

  // Fold the batch per market in memory first, then apply one baseline write per touched
  // market (instead of one read-modify-write per raw row).
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

  // Delete only the rows we just folded (by id) — never a rescan — so a row appended
  // concurrently after the `take()` above is left for the next run, not dropped unfolded.
  for (const row of stale) await ctx.db.delete(row._id)

  return { compacted: stale.length, markets: folded.size }
}

async function readDeltaSnapshotRows(ctx: QueryCtx) {
  return ctx.db
    .query("liquidityDeltasCache")
    .withIndex("by_singleton", (q) => q.eq("singleton", DELTAS_SINGLETON))
    .collect()
}

function selectCanonicalSnapshot<T extends { updatedAt: number }>(rows: T[]) {
  if (rows.length === 0) return null
  return rows.reduce((latest, row) => (row.updatedAt >= latest.updatedAt ? row : latest))
}

// The shared ledger is written ONLY as a server-side side-effect of a validated
// `recordTransaction` (which recomputes the delta from the wallet-owned position, see
// `convex/sandbox/transactions.ts:applyLedgerDelta`). There is intentionally no public,
// free-standing recorder: a public one let any signed-in wallet fold an arbitrary delta
// into any market, corrupting every client's numbers. This internal function exists only
// for tests/tooling that need to seed a delta; it is absent from the public `api`.
export const recordDelta = internalMutation({
  args: {
    marketSlug: v.string(),
    borrowedDeltaUsd: v.optional(v.number()),
    suppliedDeltaUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const borrowedDeltaUsd = Number.isFinite(args.borrowedDeltaUsd) ? (args.borrowedDeltaUsd as number) : 0
    const suppliedDeltaUsd = Number.isFinite(args.suppliedDeltaUsd) ? (args.suppliedDeltaUsd as number) : 0
    if (borrowedDeltaUsd === 0 && suppliedDeltaUsd === 0) return

    // Append-only: a fresh row per action instead of patching one shared per-market row,
    // so concurrent writers never contend on the same document (`listDeltas` folds them).
    await ctx.db.insert("marketLiquidityDeltas", {
      marketSlug: args.marketSlug,
      borrowedDeltaUsd,
      suppliedDeltaUsd,
      updatedAt: Date.now(),
    })
  },
})

/**
 * Direct fold of the compacted baseline + the un-compacted delta rows (bounded by
 * `#markets + #recent rows`; see `foldDeltas`). It still reads the whole un-compacted
 * window, so subscribing to it invalidates every subscriber whenever a delta row changes
 * — do NOT use it as the app-wide subscription (use `listDeltaSnapshot`). Kept for the
 * snapshot rebuild and for tests that assert the exact ledger state immediately after a
 * write. Result equals the naive sum of every delta ever applied.
 */
export const listDeltas = query({
  args: {},
  handler: async (ctx) => {
    await requireLiquidityReader(ctx)
    return foldDeltas(ctx)
  },
})

/**
 * App-wide liquidity subscription. Reads the single precomputed `liquidityDeltasCache`
 * document (O(1)), so ONE user's borrow/repay/supply/withdraw does not invalidate every
 * other subscriber. Cold-cache fallback: fold the raw events if the snapshot has not been
 * built yet (fresh deploy, before the first `rebuildDeltaSnapshot`); steady state never
 * hits that path. Same row shape as `listDeltas`.
 */
export const listDeltaSnapshot = query({
  args: {},
  handler: async (ctx) => {
    await requireLiquidityReader(ctx)
    const cache = selectCanonicalSnapshot(await readDeltaSnapshotRows(ctx))
    if (cache) return cache.rows
    return foldDeltas(ctx)
  },
})

/**
 * Rebuild the `liquidityDeltasCache` singleton from the bounded fold (compacted baseline +
 * un-compacted deltas). Runs the fold once and upserts the single cache row. Driven by a
 * schedule (`crons.ts`), never on the hot read path. Internal-only so anonymous callers
 * can't trigger the fold.
 */
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
    return { markets: rows.length }
  },
})

/**
 * Scheduled compaction. Folds the OLDEST `marketLiquidityDeltas` rows into the per-market
 * `marketLiquidityBaseline` accumulators and deletes them, keeping the raw event table —
 * and therefore the live fold input — bounded regardless of how many actions have ever
 * been taken. This is what makes the fold scale past thousands of onboarded wallets
 * without approaching Convex's per-transaction document-scan limit.
 *
 * Migration is automatic: pre-existing raw rows (from before this table existed, incl. the
 * three delta rows every historical onboarding claim appended) are just old rows — the
 * first runs fold them into the baseline and delete them, with no backfill step and no
 * double counting. Idempotent on the total: `baseline + remaining raw` is invariant, so a
 * fresh deployment (empty tables) and one with existing rows both converge to the same
 * per-market totals. Batched (`COMPACTION_BATCH`) so a large backlog drains over several
 * runs. Internal-only; touches only the ledger tables, never a hot append document.
 */
export const compactDeltas = internalMutation({
  args: {},
  handler: async (ctx) => compactDeltaRows(ctx),
})
