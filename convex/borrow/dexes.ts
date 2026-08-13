/**
 * DEX registry — 4 static entries at seed (Uniswap / Curve / Balancer /
 * Aerodrome). Replaces BORROW_DEXES constant.
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"

const dexRow = {
  id: v.string(),
  label: v.string(),
  tvlUsd: v.number(),
  bgClass: v.string(),
  textClass: v.string(),
}

export const listDexes = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("dexes").collect()
    return rows.map(({ _id: _mid, _creationTime: _mct, updatedAt: _mua, ...rest }) => rest)
  },
})

export const upsertDexes = internalMutation({
  args: { rows: v.array(v.object(dexRow)) },
  handler: async (ctx, { rows }) => {
    const now = Date.now()
    for (const row of rows) {
      const existing = await ctx.db
        .query("dexes")
        .withIndex("by_key", (q) => q.eq("id", row.id))
        .unique()
      if (existing) await ctx.db.patch(existing._id, { ...row, updatedAt: now })
      else await ctx.db.insert("dexes", { ...row, updatedAt: now })
    }
    return { written: rows.length }
  },
})
