/**
 * Risk queries — powers the `RiskSection` on both the asset and pool detail pages.
 *
 * Reads the freshest `riskAssessments` row for a market and returns it shaped
 * exactly like `RiskAssessment` in `app/lib/borrow-detail/types.ts`, so the
 * detail builder can inject it with no transformation. The seed populates the
 * rich `breakdown` + `metrics` via the shared risk-model (see
 * `app/lib/borrow-detail/risk-model.ts`), so this query never falls back to a
 * stub when the table is seeded.
 */

import { v } from "convex/values"
import { query } from "./_generated/server"

const marketScope = v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"), v.literal("multiply"))

/** Latest risk assessment for an asset or pool. Returns null when unseeded. */
export const getRisk = query({
  args: { scope: marketScope, slug: v.string() },
  handler: async (ctx, { scope, slug }) => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_scope_slug", (q) => q.eq("scope", scope).eq("slug", slug))
      .unique()
    if (!market) return null

    const latest = await ctx.db
      .query("riskAssessments")
      .withIndex("by_market_assessed_at", (q) => q.eq("marketId", market._id))
      .order("desc")
      .first()
    if (!latest) return null

    return {
      premiumBps: latest.premiumBps,
      level: latest.level,
      score: latest.score,
      headline: latest.headline,
      summary: latest.summary,
      breakdown: latest.breakdown,
      metrics: latest.metrics,
    }
  },
})
