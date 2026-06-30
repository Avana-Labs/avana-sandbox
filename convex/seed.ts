/**
 * Seed mutations for the market data layer. Self-contained (no app imports, so it
 * bundles cleanly). The deterministic ROW DATA is built in the repo by
 * `app/lib/convex-seed/build-seed.ts` and pushed here in batches by
 * `scripts/seed-convex.mjs`.
 *
 * All writes are IDEMPOTENT upserts keyed by (marketId, day) / (scope, slug), so
 * re-running the seed updates rows in place — there is no destructive "clear all"
 * exposed publicly. Safe to run repeatedly.
 */

import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

const marketScope = v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"))
const riskLevel = v.union(v.literal("low"), v.literal("moderate"), v.literal("elevated"), v.literal("high"))

/**
 * Lightweight seed-verification: exact counts for the small tables (markets, risk)
 * and a non-empty signal for the large daily tables (collecting 46k+ rows would
 * blow the per-query read limit). Use getBorrowEconomy in convex/markets.ts for
 * the calibrated aggregate totals.
 */
export const getCounts = query({
  args: {},
  handler: async (ctx) => {
    const markets = await ctx.db.query("markets").collect()
    const risk = await ctx.db.query("riskAssessments").collect()
    const allocation = await ctx.db.query("assetPoolAllocationDaily").collect()
    const content = await ctx.db.query("marketContent").collect()
    const oneStat = await ctx.db.query("marketDailyStats").take(1)
    const oneRevenue = await ctx.db.query("marketRevenueDaily").take(1)
    const oneRiskWithBreakdown = risk.find((r) => r.breakdown.length > 0)
    return {
      markets: markets.length,
      assetMarkets: markets.filter((m) => m.scope === "asset").length,
      poolMarkets: markets.filter((m) => m.scope === "pool").length,
      riskAssessments: risk.length,
      riskBreakdownSeeded: oneRiskWithBreakdown !== undefined,
      allocationRows: allocation.length,
      contentRows: content.length,
      dailyStatsSeeded: oneStat.length > 0,
      revenueSeeded: oneRevenue.length > 0,
    }
  },
})

/** Upsert canonical markets by (scope, slug); returns the slug → _id map for this batch. */
export const upsertMarkets = mutation({
  args: {
    rows: v.array(
      v.object({
        scope: marketScope,
        slug: v.string(),
        chainId: v.number(),
        name: v.string(),
        symbol: v.string(),
        venueLabel: v.optional(v.string()),
        category: v.optional(v.union(v.literal("stable"), v.literal("crypto"))),
        explorerUrl: v.optional(v.string()),
        reserveFactorPct: v.optional(v.number()),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    const idsBySlug: Record<string, Id<"markets">> = {}
    for (const row of rows) {
      const existing = await ctx.db
        .query("markets")
        .withIndex("by_scope_slug", (q) => q.eq("scope", row.scope).eq("slug", row.slug))
        .unique()
      if (existing) {
        await ctx.db.patch(existing._id, row)
        idsBySlug[row.slug] = existing._id
      } else {
        idsBySlug[row.slug] = await ctx.db.insert("markets", row)
      }
    }
    return { idsBySlug }
  },
})

/** Upsert daily market stats by (marketId, day). */
export const upsertDailyStats = mutation({
  args: {
    rows: v.array(
      v.object({
        marketId: v.id("markets"),
        day: v.string(),
        suppliedUsd: v.number(),
        borrowedUsd: v.number(),
        utilizationPct: v.number(),
        supplyApyPct: v.number(),
        borrowAprPct: v.number(),
        tvlUsd: v.number(),
        volumeUsd: v.number(),
        feesUsd: v.number(),
        priceUsd: v.optional(v.number()),
        supplyCapUsd: v.optional(v.number()),
        borrowCapUsd: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("marketDailyStats")
        .withIndex("by_market_day", (q) => q.eq("marketId", row.marketId).eq("day", row.day))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("marketDailyStats", row)
    }
    return { written: rows.length }
  },
})

/** Upsert daily revenue by (marketId, day). */
export const upsertRevenue = mutation({
  args: {
    rows: v.array(
      v.object({
        marketId: v.id("markets"),
        day: v.string(),
        interestFromBorrowersUsd: v.number(),
        interestToSuppliersUsd: v.number(),
        reserveTakeUsd: v.number(),
        rewardsDistributedUsd: v.number(),
        swapFeesUsd: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("marketRevenueDaily")
        .withIndex("by_market_day", (q) => q.eq("marketId", row.marketId).eq("day", row.day))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("marketRevenueDaily", row)
    }
    return { written: rows.length }
  },
})

/** Upsert the latest risk assessment per market (one row per marketId). */
export const upsertRisk = mutation({
  args: {
    rows: v.array(
      v.object({
        marketId: v.id("markets"),
        assessedAt: v.number(),
        premiumBps: v.number(),
        level: riskLevel,
        score: v.number(),
        headline: v.string(),
        summary: v.string(),
        breakdown: v.array(
          v.object({ id: v.string(), label: v.string(), bps: v.number(), level: riskLevel, description: v.string() }),
        ),
        metrics: v.array(v.object({ id: v.string(), label: v.string(), value: v.string(), hint: v.optional(v.string()) })),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("riskAssessments")
        .withIndex("by_market_assessed_at", (q) => q.eq("marketId", row.marketId))
        .order("desc")
        .first()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("riskAssessments", row)
    }
    return { written: rows.length }
  },
})

/** Upsert latest-day allocation rows keyed by (assetId, poolId, day). */
export const upsertAllocation = mutation({
  args: {
    rows: v.array(
      v.object({
        assetId: v.id("markets"),
        poolId: v.id("markets"),
        day: v.string(),
        valueUsd: v.number(),
        sharePct: v.number(),
        utilizationPct: v.number(),
        borrowAprPct: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const sameAssetDay = await ctx.db
        .query("assetPoolAllocationDaily")
        .withIndex("by_asset_day", (q) => q.eq("assetId", row.assetId).eq("day", row.day))
        .collect()
      const existing = sameAssetDay.find((r) => r.poolId === row.poolId)
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("assetPoolAllocationDaily", row)
    }
    return { written: rows.length }
  },
})

/** Upsert per-market editorial content (about/stats/history/faqs) by marketId. */
export const upsertContent = mutation({
  args: {
    rows: v.array(
      v.object({
        marketId: v.id("markets"),
        description: v.string(),
        stats: v.array(v.object({ label: v.string(), value: v.string(), href: v.optional(v.string()) })),
        history: v.array(v.object({ date: v.string(), title: v.string(), description: v.optional(v.string()) })),
        faqs: v.array(v.object({ question: v.string(), answer: v.string() })),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("marketContent")
        .withIndex("by_market", (q) => q.eq("marketId", row.marketId))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("marketContent", row)
    }
    return { written: rows.length }
  },
})

const walletEventKind = v.union(
  v.literal("supply"),
  v.literal("withdraw"),
  v.literal("borrow"),
  v.literal("repay"),
  v.literal("liquidation"),
  v.literal("rewardsClaim"),
)

/** Delete a page of walletEvents (batched; loop from the caller until deleted=0). */
export const clearWalletEvents = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db.query("walletEvents").take(limit ?? 2000)
    for (const row of rows) await ctx.db.delete(row._id)
    return { deleted: rows.length }
  },
})

/** Insert wallet activity events (engagement source). Clear first for idempotent re-seed. */
export const insertWalletEvents = mutation({
  args: {
    rows: v.array(
      v.object({
        marketId: v.id("markets"),
        wallet: v.string(),
        kind: walletEventKind,
        amountUsd: v.number(),
        counterparty: v.optional(v.string()),
        txHash: v.string(),
        blockNumber: v.number(),
        at: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) await ctx.db.insert("walletEvents", row)
    return { written: rows.length }
  },
})
