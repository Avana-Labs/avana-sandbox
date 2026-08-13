/**
 * Lend product — Risk Premium / assessment card.
 * Table: `lendRiskAssessments` (slug-keyed; not shared with borrow/multiply).
 * Distinct from `lendRiskParameters` (parameter grid).
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
      .query("lendRiskAssessments")
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
        ...assessmentFields,
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("lendRiskAssessments")
        .withIndex("by_slug", (q) => q.eq("slug", row.slug))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("lendRiskAssessments", row)
    }
    // Keep marketSnapshotsCache aligned — see borrow/riskAssessment.ts for rationale.
    if (rows.length > 0) {
      await ctx.scheduler.runAfter(0, internal.markets.rebuildMarketSnapshots, {})
    }
    return { written: rows.length }
  },
})
