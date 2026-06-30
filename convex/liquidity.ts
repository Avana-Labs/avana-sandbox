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
import { getAuthedWallet } from "./sandbox/auth"

// A single delta may not move a market by more than this in one write — a sane bound
// so a tampered client cannot fold an astronomical value into the shared ledger.
const MAX_DELTA_USD = 5_000_000_000

export const recordDelta = mutation({
  args: {
    marketSlug: v.string(),
    borrowedDeltaUsd: v.optional(v.number()),
    suppliedDeltaUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // The ledger is shared across ALL users, so an unauthenticated writer could corrupt
    // every client's market numbers. Require a signed-in wallet (the whole app is gated
    // behind SIWE anyway) and bound the magnitude.
    const wallet = await getAuthedWallet(ctx)
    if (!wallet) {
      throw new Error("UNAUTHENTICATED: sign in to record market activity.")
    }
    const clamp = (n: number) => Math.max(-MAX_DELTA_USD, Math.min(MAX_DELTA_USD, n))
    const borrowedDeltaUsd = Number.isFinite(args.borrowedDeltaUsd) ? clamp(args.borrowedDeltaUsd as number) : 0
    const suppliedDeltaUsd = Number.isFinite(args.suppliedDeltaUsd) ? clamp(args.suppliedDeltaUsd as number) : 0
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
