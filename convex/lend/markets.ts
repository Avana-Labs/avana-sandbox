/**
 * Lend product — market identity.
 * Table: `lendMarkets`. Legacy `markets` remains the FK hub for walletEvents.
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"

const marketFields = {
  chainId: v.number(),
  name: v.string(),
  symbol: v.string(),
  venueLabel: v.optional(v.string()),
  category: v.optional(v.union(v.literal("stable"), v.literal("crypto"))),
  explorerUrl: v.optional(v.string()),
  reserveFactorPct: v.optional(v.number()),
  rewardsApyPct: v.optional(v.number()),
  description: v.optional(v.string()),
  iconUrl: v.optional(v.string()),
  spokeId: v.optional(v.string()),
  feeTier: v.optional(v.string()),
  maxLtvPct: v.optional(v.number()),
  priceUsd: v.optional(v.number()),
  visuals: v.optional(
    v.array(
      v.object({
        symbol: v.string(),
        shortLabel: v.string(),
        bgClassName: v.string(),
        textClassName: v.string(),
        iconUrl: v.optional(v.string()),
      }),
    ),
  ),
  resources: v.optional(v.array(v.object({ label: v.string(), href: v.string() }))),
  createdAt: v.number(),
}

export const getMarket = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("lendMarkets")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    if (!row) return null
    return {
      slug: row.slug,
      scope: "lend" as const,
      chainId: row.chainId,
      name: row.name,
      symbol: row.symbol,
      venueLabel: row.venueLabel,
      category: row.category,
      explorerUrl: row.explorerUrl,
      reserveFactorPct: row.reserveFactorPct,
      rewardsApyPct: row.rewardsApyPct,
      description: row.description,
      iconUrl: row.iconUrl,
      spokeId: row.spokeId,
      feeTier: row.feeTier,
      maxLtvPct: row.maxLtvPct,
      priceUsd: row.priceUsd,
      visuals: row.visuals,
      resources: row.resources,
      createdAt: row.createdAt,
    }
  },
})

export const upsertMarkets = internalMutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        ...marketFields,
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("lendMarkets")
        .withIndex("by_slug", (q) => q.eq("slug", row.slug))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("lendMarkets", row)
    }
    return { written: rows.length }
  },
})
