/**
 * Fiat FX rates through the validated Convex layer. A scheduled action pulls rates from
 * open.er-api.com (free, keyless, USD-based), validates them, and upserts the `fxRates` table;
 * queries read them. This mirrors the token-price oracle (convex/prices.ts) so fiat conversion no
 * longer depends on independent client polling, and staleness surfaces the same way.
 *
 * Flow: cron → refreshFxRates (action, fetch) → upsertFxRates (mutation) → getFxRates (query).
 */

import { v } from "convex/values"
import { internalAction, internalMutation, query } from "./_generated/server"
import { internal } from "./_generated/api"

/**
 * The fiat currencies the app supports (must mirror CURRENCY_OPTIONS in the app; Convex can't
 * import app/ modules). USD is always 1. Drift from the app list is caught by the currency tests.
 */
export const SUPPORTED_FX_CURRENCIES = [
  "USD",
  "ARS",
  "AUD",
  "BRL",
  "CAD",
  "CNY",
  "COP",
  "EUR",
  "GBP",
  "HKD",
  "IDR",
  "INR",
  "JPY",
  "KRW",
] as const

/** FX moves slowly (daily provider updates); tolerate a couple missed hourly runs before stale. */
export const FX_REFRESH_INTERVAL_MS = 60 * 60 * 1000
export const FX_STALE_AFTER_MS = 6 * 60 * 60 * 1000
export const FX_INVALID_AFTER_MS = 48 * 60 * 60 * 1000

export function classifyFxStatus(ageMs: number): "fresh" | "stale" | "invalid" {
  if (ageMs >= FX_INVALID_AFTER_MS) return "invalid"
  if (ageMs >= FX_STALE_AFTER_MS) return "stale"
  return "fresh"
}

export const getFxRates = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("fxRates").collect()
    const rates = rows.map((r) => ({
      currency: r.currency,
      usdPerUnit: r.usdPerUnit,
      source: r.source,
      status: r.status,
      updatedAt: r.updatedAt,
    }))
    const updatedAt = rows.length === 0 ? null : Math.min(...rows.map((r) => r.updatedAt))
    return { rates, status: { updatedAt, staleAfterMs: FX_STALE_AFTER_MS, count: rows.length } }
  },
})

export const upsertFxRates = internalMutation({
  args: {
    rows: v.array(
      v.object({
        currency: v.string(),
        usdPerUnit: v.number(),
        source: v.string(),
        status: v.optional(v.union(v.literal("fresh"), v.literal("stale"), v.literal("invalid"))),
        sourceUpdatedAt: v.optional(v.number()),
        fetchedAt: v.optional(v.number()),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { rows }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("fxRates")
        .withIndex("by_currency", (q) => q.eq("currency", row.currency))
        .unique()
      if (existing) await ctx.db.patch(existing._id, row)
      else await ctx.db.insert("fxRates", row)
    }
    return { written: rows.length }
  },
})

type ErApiResponse = {
  result?: string
  rates?: Record<string, number>
  time_last_update_unix?: number
}

/**
 * Fetch current FX rates and upsert them. Internal-only. Failures are re-thrown so the run is
 * recorded FAILED (and the UI surfaces staleness) rather than silently serving old rates as fresh.
 */
export const refreshFxRates = internalAction({
  args: {},
  handler: async (ctx): Promise<{ written: number }> => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD")
      if (!res.ok) throw new Error(`er-api request failed: ${res.status}`)
      const json = (await res.json()) as ErApiResponse
      if (json.result !== "success" || !json.rates) throw new Error("er-api returned no usable rates")
      const now = Date.now()
      const sourceUpdatedAt = typeof json.time_last_update_unix === "number" ? json.time_last_update_unix * 1000 : now
      const status = classifyFxStatus(Math.max(0, now - sourceUpdatedAt))
      const rows = SUPPORTED_FX_CURRENCIES.map((currency) => {
        const usdPerUnit = currency === "USD" ? 1 : json.rates![currency]
        // Guard the stored value: reject non-finite / non-positive quotes.
        if (!Number.isFinite(usdPerUnit) || usdPerUnit <= 0) return null
        return { currency, usdPerUnit, source: "er-api", status, sourceUpdatedAt, fetchedAt: now, updatedAt: now }
      }).filter((r): r is NonNullable<typeof r> => r !== null)
      if (rows.length === 0) throw new Error("er-api yielded no usable supported-currency rates")
      await ctx.runMutation(internal.fx.upsertFxRates, { rows })
      return { written: rows.length }
    } catch (err) {
      console.error("[fx] refreshFxRates failed; UI will surface staleness via getFxRates:", err)
      throw err
    }
  },
})
