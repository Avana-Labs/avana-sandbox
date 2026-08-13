/**
 * Multiply product — Risk Parameters. Table: `multiplyRiskParameters`.
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"

const parameterRow = v.object({
  id: v.string(),
  label: v.string(),
  value: v.string(),
  description: v.optional(v.string()),
})

export const getRiskParameters = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("multiplyRiskParameters")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    if (!row) return null
    return {
      slug: row.slug,
      parameters: row.parameters,
      updatedAt: row.updatedAt,
      source: row.source,
    }
  },
})

export const upsertRiskParameters = internalMutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        parameters: v.array(parameterRow),
        updatedAt: v.number(),
        source: v.optional(v.union(v.literal("seed"), v.literal("chain"))),
        txHash: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("multiplyRiskParameters")
        .withIndex("by_slug", (q) => q.eq("slug", row.slug))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("multiplyRiskParameters", row)
    }
    return { written: rows.length }
  },
})
