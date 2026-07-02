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
 * Convex OCC. Reads fold O(#events).
 *
 * The app-wide subscription reads `listDeltaSnapshot` — a single precomputed cache
 * document rebuilt on a schedule (`crons.ts`) — NOT the raw event table. Subscribing
 * to the raw table meant one user's write invalidated every user's subscription and
 * re-folded the whole table per subscriber; the snapshot decouples the hot write path
 * from every reader, bounding cross-user staleness to the refresh interval.
 */

import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"
import type { QueryCtx } from "./_generated/server"

/** Single cache row discriminator (see `liquidityDeltasCache` in schema.ts). */
const DELTAS_SINGLETON = "deltas"

type FoldedDelta = { marketSlug: string; borrowedDeltaUsd: number; suppliedDeltaUsd: number; updatedAt: number }

/** Fold the append-only event table into one net aggregate per market. */
async function foldDeltas(ctx: QueryCtx): Promise<FoldedDelta[]> {
  const rows = await ctx.db.query("marketLiquidityDeltas").collect()
  const byMarket = new Map<string, { borrowedDeltaUsd: number; suppliedDeltaUsd: number; updatedAt: number }>()
  for (const row of rows) {
    const acc = byMarket.get(row.marketSlug)
    if (acc) {
      acc.borrowedDeltaUsd += row.borrowedDeltaUsd
      acc.suppliedDeltaUsd += row.suppliedDeltaUsd
      acc.updatedAt = Math.max(acc.updatedAt, row.updatedAt)
    } else {
      byMarket.set(row.marketSlug, {
        borrowedDeltaUsd: row.borrowedDeltaUsd,
        suppliedDeltaUsd: row.suppliedDeltaUsd,
        updatedAt: row.updatedAt,
      })
    }
  }
  return Array.from(byMarket, ([marketSlug, net]) => ({ marketSlug, ...net }))
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
 * Direct fold of the append-only event table. Reads the WHOLE table, so subscribing to
 * it invalidates every subscriber on every write — do NOT use it as the app-wide
 * subscription (use `listDeltaSnapshot`). Kept for the snapshot rebuild and for tests
 * that assert the exact ledger state immediately after a write.
 */
export const listDeltas = query({
  args: {},
  handler: async (ctx) => foldDeltas(ctx),
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
    const cache = selectCanonicalSnapshot(await readDeltaSnapshotRows(ctx))
    if (cache) return cache.rows
    return foldDeltas(ctx)
  },
})

/**
 * Rebuild the `liquidityDeltasCache` singleton from the append-only event table. Runs the
 * fold once and upserts the single cache row. Driven by a schedule (`crons.ts`), never on
 * the hot read path. Internal-only so anonymous callers can't trigger the full fold.
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
