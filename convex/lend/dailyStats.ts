/**
 * Lend product — daily market stats.
 * Table: `lendDailyStats` (slug-keyed; not shared with borrow/multiply).
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"

const dailyStatFields = {
  day: v.string(),
  suppliedUsd: v.number(),
  borrowedUsd: v.number(),
  utilizationPct: v.number(),
  supplyApyPct: v.number(),
  borrowAprPct: v.number(),
  tvlUsd: v.number(),
  volumeUsd: v.number(),
  feesUsd: v.number(),
  priceUsd: v.optional(v.number()),
  supplyCapUsd: v.optional(v.number()),
  borrowCapUsd: v.optional(v.number()),
}

export const getLatestStats = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("lendDailyStats")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug))
      .order("desc")
      .first()
    if (!row) return null
    return {
      slug: row.slug,
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
  },
})

export const upsertDailyStats = internalMutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        ...dailyStatFields,
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("lendDailyStats")
        .withIndex("by_slug_day", (q) => q.eq("slug", row.slug).eq("day", row.day))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("lendDailyStats", row)
    }
    return { written: rows.length }
  },
})
