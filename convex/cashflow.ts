/**
 * Legacy shared cashflow queries — prefer product-siloed revenue tables, fall back to
 * `marketRevenueDaily` keyed by `markets` id. Detail hydration should call
 * `borrow|lend|multiply.cashflow.*` directly; these remain for older callers.
 */

import { v } from "convex/values"
import { query, type QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import {
  buildCashflowBreakdown,
  buildRevenueTrend,
  loadSiloedRevenueDaily,
  rollupMonthlyRevenue,
  type RevenueDailyAmounts,
} from "./cashflowHelpers"

export const getRevenueForAsset = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const siloed = await loadSiloedRevenueDaily(ctx, "borrowRevenueDaily", slug)
    if (siloed.length > 0) return buildRevenueTrend(rollupMonthlyRevenue(siloed), slug)

    const market = await resolveMarket(ctx, "asset", slug)
    if (!market) return null
    const monthly = await monthlyRevenueLegacy(ctx, market._id)
    return buildRevenueTrend(monthly, String(market._id))
  },
})

export const getBreakdownForAsset = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const siloed = await loadSiloedRevenueDaily(ctx, "borrowRevenueDaily", slug)
    if (siloed.length > 0) return buildCashflowBreakdown(rollupMonthlyRevenue(siloed), slug, "asset")

    const market = await resolveMarket(ctx, "asset", slug)
    if (!market) return null
    const monthly = await monthlyRevenueLegacy(ctx, market._id)
    return buildCashflowBreakdown(monthly, String(market._id), "asset")
  },
})

export const getBreakdownForPool = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const siloed = await loadSiloedRevenueDaily(ctx, "borrowRevenueDaily", slug)
    if (siloed.length > 0) return buildCashflowBreakdown(rollupMonthlyRevenue(siloed), slug, "pool")

    const market = await resolveMarket(ctx, "pool", slug)
    if (!market) return null
    const monthly = await monthlyRevenueLegacy(ctx, market._id)
    return buildCashflowBreakdown(monthly, String(market._id), "pool")
  },
})

export const getBreakdownForLend = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const siloed = await loadSiloedRevenueDaily(ctx, "lendRevenueDaily", slug)
    if (siloed.length > 0) return buildCashflowBreakdown(rollupMonthlyRevenue(siloed), slug, "lend")

    const market = await resolveMarket(ctx, "lend", slug)
    if (!market) return null
    const monthly = await monthlyRevenueLegacy(ctx, market._id)
    return buildCashflowBreakdown(monthly, String(market._id), "lend")
  },
})

export const getBreakdownForMultiply = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const siloed = await loadSiloedRevenueDaily(ctx, "multiplyRevenueDaily", slug)
    if (siloed.length > 0) return buildCashflowBreakdown(rollupMonthlyRevenue(siloed), slug, "multiply")

    const market = await resolveMarket(ctx, "multiply", slug)
    if (!market) return null
    const monthly = await monthlyRevenueLegacy(ctx, market._id)
    return buildCashflowBreakdown(monthly, String(market._id), "multiply")
  },
})

async function monthlyRevenueLegacy(ctx: QueryCtx, marketId: Id<"markets">) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  const startDay = start.toISOString().slice(0, 10)
  const rows = await ctx.db
    .query("marketRevenueDaily")
    .withIndex("by_market_day", (q) => q.eq("marketId", marketId).gte("day", startDay))
    .collect()
  const amounts: RevenueDailyAmounts[] = rows.map((row) => ({
    day: row.day,
    interestFromBorrowersUsd: row.interestFromBorrowersUsd,
    interestToSuppliersUsd: row.interestToSuppliersUsd,
    reserveTakeUsd: row.reserveTakeUsd,
    rewardsDistributedUsd: row.rewardsDistributedUsd,
    swapFeesUsd: row.swapFeesUsd,
  }))
  return rollupMonthlyRevenue(amounts, now)
}

async function resolveMarket(ctx: QueryCtx, scope: "asset" | "pool" | "lend" | "multiply", slug: string) {
  return ctx.db
    .query("markets")
    .withIndex("by_scope_slug", (q) => q.eq("scope", scope).eq("slug", slug))
    .unique()
}
