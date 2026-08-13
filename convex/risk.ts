/**
 * Legacy shared risk query — prefers product-siloed assessment tables, falls back to
 * `riskAssessments` keyed by `markets` id. Detail hydration should call
 * `borrow|lend|multiply.riskAssessment.getRisk` directly; this remains for older callers.
 */

import { v } from "convex/values"
import { query } from "./_generated/server"

const marketScope = v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"), v.literal("multiply"))

function shapeAssessment(row: {
  premiumBps: number
  level: "low" | "moderate" | "elevated" | "high"
  score: number
  headline: string
  summary: string
  breakdown: Array<{
    id: string
    label: string
    bps: number
    level: "low" | "moderate" | "elevated" | "high"
    description: string
  }>
  metrics: Array<{ id: string; label: string; value: string; hint?: string }>
}) {
  return {
    premiumBps: row.premiumBps,
    level: row.level,
    score: row.score,
    headline: row.headline,
    summary: row.summary,
    breakdown: row.breakdown,
    metrics: row.metrics,
  }
}

/** Latest risk assessment for a market. Returns null when unseeded. */
export const getRisk = query({
  args: { scope: marketScope, slug: v.string() },
  handler: async (ctx, { scope, slug }) => {
    if (scope === "asset" || scope === "pool") {
      const siloed = await ctx.db
        .query("borrowRiskAssessments")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
      if (siloed) return shapeAssessment(siloed)
    } else if (scope === "lend") {
      const siloed = await ctx.db
        .query("lendRiskAssessments")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
      if (siloed) return shapeAssessment(siloed)
    } else {
      const siloed = await ctx.db
        .query("multiplyRiskAssessments")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
      if (siloed) return shapeAssessment(siloed)
    }

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

    return shapeAssessment(latest)
  },
})
