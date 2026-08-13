/**
 * Borrow spoke registry — public list query, internal upsert.
 * Replaces the BORROW_SPOKES / SPOKE_SLUGS / SMART_SPOKES constants at seed time.
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"

const tokenVisual = v.object({
  symbol: v.string(),
  iconUrl: v.string(),
  shortLabel: v.string(),
  bgClass: v.string(),
  textClass: v.string(),
})

const spokeRow = {
  id: v.string(),
  slug: v.string(),
  dex: v.string(),
  label: v.string(),
  description: v.string(),
  eMode: v.optional(v.string()),
  maxLtvPct: v.number(),
  aprApproxPct: v.number(),
  riskPremiumBps: v.number(),
  liquidityUsd: v.number(),
  liquidationUsdApprox: v.number(),
  bgClass: v.string(),
  textClass: v.string(),
  borrowableTokens: v.array(tokenVisual),
  isSmartSpoke: v.boolean(),
}

export const listSpokes = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("spokes").collect()
    return rows.map(({ _id: _mid, _creationTime: _mct, updatedAt: _mua, ...rest }) => rest)
  },
})

export const getSpoke = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await ctx.db
      .query("spokes")
      .withIndex("by_key", (q) => q.eq("id", id))
      .unique()
    if (!row) return null
    const { _id: _mid, _creationTime: _mct, updatedAt: _mua, ...rest } = row
    return rest
  },
})

export const upsertSpokes = internalMutation({
  args: { rows: v.array(v.object(spokeRow)) },
  handler: async (ctx, { rows }) => {
    const now = Date.now()
    for (const row of rows) {
      const existing = await ctx.db
        .query("spokes")
        .withIndex("by_key", (q) => q.eq("id", row.id))
        .unique()
      if (existing) await ctx.db.patch(existing._id, { ...row, updatedAt: now })
      else await ctx.db.insert("spokes", { ...row, updatedAt: now })
    }
    return { written: rows.length }
  },
})
