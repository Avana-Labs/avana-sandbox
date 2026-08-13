/**
 * Multiply product — Cashflow.
 * Table: `multiplyRevenueDaily` (slug-keyed; not shared with borrow/lend).
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"
import { buildCashflowBreakdown, loadSiloedRevenueDaily, rollupMonthlyRevenue } from "../cashflowHelpers"

const revenueFields = {
  day: v.string(),
  interestFromBorrowersUsd: v.number(),
  interestToSuppliersUsd: v.number(),
  reserveTakeUsd: v.number(),
  rewardsDistributedUsd: v.number(),
  swapFeesUsd: v.number(),
}

export const getBreakdown = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const rows = await loadSiloedRevenueDaily(ctx, "multiplyRevenueDaily", slug)
    if (rows.length === 0) return null
    return buildCashflowBreakdown(rollupMonthlyRevenue(rows), slug, "multiply")
  },
})

export const upsertRevenueDaily = internalMutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        ...revenueFields,
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("multiplyRevenueDaily")
        .withIndex("by_slug_day", (q) => q.eq("slug", row.slug).eq("day", row.day))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("multiplyRevenueDaily", row)
    }
    return { written: rows.length }
  },
})
