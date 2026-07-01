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
