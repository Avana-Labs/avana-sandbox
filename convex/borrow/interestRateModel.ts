/**
 * Borrow product — Interest Rate Model params for asset detail pages.
 * Table: `borrowInterestRateModels` (slug-keyed; not shared with lend).
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"

export const getInterestRateModel = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("borrowInterestRateModels")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()
    if (!row) return null

    // Prefer product-siloed daily stats; fall back to legacy marketDailyStats.
    const siloed = await ctx.db
      .query("borrowDailyStats")
      .withIndex("by_slug_day", (q) => q.eq("slug", slug))
      .order("desc")
      .first()
    let utilizationPct = siloed?.utilizationPct ?? 0
    let baseBorrowAprPct = siloed?.borrowAprPct ?? 0
    if (!siloed) {
      const market = await ctx.db
        .query("markets")
        .withIndex("by_scope_slug", (q) => q.eq("scope", "asset").eq("slug", slug))
        .unique()
      if (market) {
        const latest = await ctx.db
          .query("marketDailyStats")
          .withIndex("by_market_day", (q) => q.eq("marketId", market._id))
          .order("desc")
          .first()
        if (latest) {
          utilizationPct = latest.utilizationPct
          baseBorrowAprPct = latest.borrowAprPct
        }
      }
    }

    // The daily-stat APR is the BASE rate only. The rate the engine actually charges — and
    // what the borrow list / dashboard display — is base + risk premium. Add the per-asset
    // risk premium here so the detail IRM headline uses the same "base + risk premium" source
    // as every other surface (C2), instead of the base-only walked value.
    const assessment = await ctx.db
      .query("borrowRiskAssessments")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first()
    const riskPremiumPct = assessment ? assessment.premiumBps / 100 : 0
    const borrowAprPct = baseBorrowAprPct + riskPremiumPct

    return {
      slug: row.slug,
      optimalUtilizationPct: row.optimalUtilizationPct,
      slopeBelowOptimalPct: row.slopeBelowOptimalPct,
      slopeAboveOptimalPct: row.slopeAboveOptimalPct,
      baseBorrowRatePct: row.baseBorrowRatePct,
      utilizationPct,
      borrowAprPct,
      updatedAt: row.updatedAt,
      source: row.source,
    }
  },
})

export const upsertInterestRateModels = internalMutation({
  args: {
    rows: v.array(
      v.object({
        slug: v.string(),
        optimalUtilizationPct: v.number(),
        slopeBelowOptimalPct: v.number(),
        slopeAboveOptimalPct: v.number(),
        baseBorrowRatePct: v.number(),
        updatedAt: v.number(),
        source: v.optional(v.union(v.literal("seed"), v.literal("chain"))),
        txHash: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("borrowInterestRateModels")
        .withIndex("by_slug", (q) => q.eq("slug", row.slug))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("borrowInterestRateModels", row)
    }
    return { written: rows.length }
  },
})
