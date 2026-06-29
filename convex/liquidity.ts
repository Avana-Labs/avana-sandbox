/**
 * Shared multi-user market liquidity ledger.
 *
 * Every borrow / repay / supply / withdraw from any client calls `recordDelta`,
 * which folds the change into one aggregate row per market (`marketLiquidityDeltas`).
 * Every client subscribes to `listDeltas` and layers these deltas onto the static
 * catalog base, so a market's Total Borrowed / Available / Utilization (and pool
 * collateral / TVL) move with aggregate activity across all users — live — instead
 * of staying frozen.
 *
 * One row per market keeps reads O(#markets) and writes a single transactional
 * patch (Convex serializes concurrent increments with OCC retries).
 */

import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const recordDelta = mutation({
  args: {
    marketSlug: v.string(),
    borrowedDeltaUsd: v.optional(v.number()),
    suppliedDeltaUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const borrowedDeltaUsd = Number.isFinite(args.borrowedDeltaUsd) ? (args.borrowedDeltaUsd as number) : 0
    const suppliedDeltaUsd = Number.isFinite(args.suppliedDeltaUsd) ? (args.suppliedDeltaUsd as number) : 0
    if (borrowedDeltaUsd === 0 && suppliedDeltaUsd === 0) return

    const existing = await ctx.db
      .query("marketLiquidityDeltas")
      .withIndex("by_slug", (q) => q.eq("marketSlug", args.marketSlug))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        borrowedDeltaUsd: existing.borrowedDeltaUsd + borrowedDeltaUsd,
        suppliedDeltaUsd: existing.suppliedDeltaUsd + suppliedDeltaUsd,
        updatedAt: Date.now(),
      })
      return
    }

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
    const rows = await ctx.db.query("marketLiquidityDeltas").collect()
    return rows.map((row) => ({
      marketSlug: row.marketSlug,
      borrowedDeltaUsd: row.borrowedDeltaUsd,
      suppliedDeltaUsd: row.suppliedDeltaUsd,
      updatedAt: row.updatedAt,
    }))
  },
})
