/**
 * Borrow product — Risk Premium / assessment card (pool + asset).
 * Table: `borrowRiskAssessments` (slug-keyed; not shared with lend/multiply).
 * Distinct from `borrowRiskParameters` (Morpho parameter grid).
 */

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalMutation, query } from "../_generated/server"

const riskLevel = v.union(v.literal("low"), v.literal("moderate"), v.literal("elevated"), v.literal("high"))

const assessmentFields = {
  assessedAt: v.number(),
  premiumBps: v.number(),
  level: riskLevel,
  score: v.number(),
  headline: v.string(),
  summary: v.string(),
  breakdown: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
      bps: v.number(),
      level: riskLevel,
      description: v.string(),
    }),
  ),
  metrics: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
      value: v.string(),
      hint: v.optional(v.string()),
    }),
  ),
}

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

export const getRisk = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("borrowRiskAssessments")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    return row ? shapeAssessment(row) : null
  },
})

export const upsertRiskAssessments = internalMutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        kind: v.union(v.literal("pool"), v.literal("asset")),
        ...assessmentFields,
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("borrowRiskAssessments")
        .withIndex("by_slug", (q) => q.eq("slug", row.slug))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("borrowRiskAssessments", row)
    }
    // Keep marketSnapshotsCache in lockstep with the assessments table. `premiumBps`
    // is the ONLY field currently derived from this table by listMarketSnapshots
    // (via loadSiloedPremiumBps), so a write here without a cache rebuild would leave
    // list rows showing the old premium while the detail Risk card showed the new one.
    if (rows.length > 0) {
      await ctx.scheduler.runAfter(0, internal.markets.rebuildMarketSnapshots, {})
    }
    return { written: rows.length }
  },
})
