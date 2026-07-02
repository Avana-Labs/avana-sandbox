/**
 * Shared multi-user market liquidity ledger.
 *
 * Every borrow / repay / supply / withdraw from any client calls `recordDelta`,
 * which APPENDS a delta event to `marketLiquidityDeltas`. Every client subscribes to
 * `listDeltas`, which folds the events per market and layers the net onto the static
 * catalog base, so a market's Total Borrowed / Available / Utilization (and pool
 * collateral / TVL) move with aggregate activity across all users — live — instead
 * of staying frozen.
 *
 * Append-only writes keep every action on its OWN document: patching one shared
 * per-market row put concurrent writers on the same doc and made them contend under
 * Convex OCC. Reads fold O(#events).
 */

import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"

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

export const listDeltas = query({
  args: {},
  handler: async (ctx) => {
    // The ledger is append-only (a fresh row per action), so fold events into one net
    // aggregate per market for the client — same shape as before, contention-free write.
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
  },
})
