/**
 * Multiply product — Interest Rate Model params for market detail pages.
 * Table: `multiplyInterestRateModels` (slug-keyed; not shared with borrow/lend).
 *
 * Fixes the "silent mock" gap on multiply detail: the IRM card renders from a
 * PRNG-derived mock (`app/lib/multiply-detail/index.ts`) with no Convex read
 * today. This query mirrors the borrow IRM shape so the client swap in Phase E
 * is a one-line reader change.
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"

export const getInterestRateModel = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("multiplyInterestRateModels")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    if (!row) return null

    // Read current utilization/borrowApr from the multiply daily series so the
    // curve renders against a live "you are here" marker.
    const siloed = await ctx.db
      .query("multiplyDailyStats")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug))
      .order("desc")
      .first()
    let utilizationPct = siloed?.utilizationPct ?? 0
    let borrowAprPct = siloed?.borrowAprPct ?? 0
    if (!siloed) {
      const market = await ctx.db
        .query("markets")
        .withIndex("by_scope_slug", (q) => q.eq("scope", "multiply").eq("slug", slug))
        .unique()
      if (market) {
        const latest = await ctx.db
          .query("marketDailyStats")
          .withIndex("by_market_day", (q) => q.eq("marketId", market._id))
          .order("desc")
          .first()
        if (latest) {
          utilizationPct = latest.utilizationPct
          borrowAprPct = latest.borrowAprPct
        }
      }
    }

    return {
      slug: row.slug,
      optimalUtilizationPct: row.optimalUtilizationPct,
      slopeBelowOptimalPct: row.slopeBelowOptimalPct,
      slopeAboveOptimalPct: row.slopeAboveOptimalPct,
      baseBorrowRatePct: row.baseBorrowRatePct,
      utilizationPct,
      borrowAprPct,
      updatedAt: row.updatedAt,
      source: row.source,
    }
  },
})

export const upsertInterestRateModels = internalMutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        optimalUtilizationPct: v.number(),
        slopeBelowOptimalPct: v.number(),
        slopeAboveOptimalPct: v.number(),
        baseBorrowRatePct: v.number(),
        source: v.optional(v.union(v.literal("seed"), v.literal("chain"))),
        txHash: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    const now = Date.now()
    for (const row of rows) {
      const rowWithTimestamp = { ...row, updatedAt: now }
      const existing = await ctx.db
        .query("multiplyInterestRateModels")
        .withIndex("by_slug", (q) => q.eq("slug", row.slug))
        .unique()
      if (existing) await ctx.db.patch(existing._id, rowWithTimestamp)
      else await ctx.db.insert("multiplyInterestRateModels", rowWithTimestamp)
    }
    return { written: rows.length }
  },
})
