/**
 * Lend product — About / FAQs / parameter-change history.
 * Table: `lendMarketContent` (slug-keyed; not shared with borrow/multiply).
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"

const contentFields = {
  description: v.string(),
  stats: v.array(v.object({ label: v.string(), value: v.string(), href: v.optional(v.string()) })),
  history: v.array(v.object({ date: v.string(), title: v.string(), description: v.optional(v.string()) })),
  faqs: v.array(v.object({ question: v.string(), answer: v.string() })),
}

export const getContent = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("lendMarketContent")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    if (!row) return null
    return {
      description: row.description,
      stats: row.stats,
      history: row.history,
      faqs: row.faqs,
    }
  },
})

export const upsertContent = internalMutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        ...contentFields,
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("lendMarketContent")
        .withIndex("by_slug", (q) => q.eq("slug", row.slug))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("lendMarketContent", row)
    }
    return { written: rows.length }
  },
})
