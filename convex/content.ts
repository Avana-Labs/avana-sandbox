/**
 * Editorial content query — powers the About card, the Parameter-Changes history,
 * and the General FAQs on both detail pages. Reads the seeded `marketContent` row
 * for a market and returns it shaped for the detail builder to inject. Returns null
 * when unseeded so callers fall back to the catalog-derived content.
 */

import { v } from "convex/values"
import { query } from "./_generated/server"

const marketScope = v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"))

export const getContent = query({
  args: { scope: marketScope, slug: v.string() },
  handler: async (ctx, { scope, slug }) => {
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
