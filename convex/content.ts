/**
 * Legacy shared content query — prefers product-siloed tables, falls back to
 * `marketContent` keyed by `markets` id. Detail hydration should call
 * `borrow|lend|multiply.content.getContent` directly; this remains for older callers.
 */

import { v } from "convex/values"
import { query } from "./_generated/server"

const marketScope = v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"), v.literal("multiply"))

export const getContent = query({
  args: { scope: marketScope, slug: v.string() },
  handler: async (ctx, { scope, slug }) => {
    if (scope === "asset" || scope === "pool") {
      const siloed = await ctx.db
        .query("borrowMarketContent")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
      if (siloed) {
        return {
          description: siloed.description,
          stats: siloed.stats,
          history: siloed.history,
          faqs: siloed.faqs,
        }
      }
    } else if (scope === "lend") {
      const siloed = await ctx.db
        .query("lendMarketContent")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
      if (siloed) {
        return {
          description: siloed.description,
          stats: siloed.stats,
          history: siloed.history,
          faqs: siloed.faqs,
        }
      }
    } else {
      const siloed = await ctx.db
        .query("multiplyMarketContent")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
      if (siloed) {
        return {
          description: siloed.description,
          stats: siloed.stats,
          history: siloed.history,
          faqs: siloed.faqs,
        }
      }
    }

    const market = await ctx.db
      .query("markets")
      .withIndex("by_scope_slug", (q) => q.eq("scope", scope).eq("slug", slug))
      .unique()
    if (!market) return null

    const content = await ctx.db
      .query("marketContent")
      .withIndex("by_market", (q) => q.eq("marketId", market._id))
      .unique()
    if (!content) return null

    return {
      description: content.description,
      stats: content.stats,
      history: content.history,
      faqs: content.faqs,
    }
  },
})
