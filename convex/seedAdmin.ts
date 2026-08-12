import { v } from "convex/values"
import { action } from "./_generated/server"
import { internal } from "./_generated/api"

const MAX_SEED_ROWS = 2_000
const MAX_SEED_PAYLOAD_BYTES = 1_000_000
const MAX_CLEAR_WALLET_EVENTS = 10_000

function requireSeedSecret(seedSecret: string) {
  const expected = process.env.CONVEX_SEED_SECRET
  if (!expected || seedSecret !== expected) {
    throw new Error("Unauthorized seed write")
  }
}

function requireSafeSeedRows(rows: unknown[]) {
  if (rows.length > MAX_SEED_ROWS) {
    throw new Error(`Seed batch too large: max ${MAX_SEED_ROWS} rows.`)
  }
  const bytes = JSON.stringify(rows).length
  if (bytes > MAX_SEED_PAYLOAD_BYTES) {
    throw new Error(`Seed batch payload too large: max ${MAX_SEED_PAYLOAD_BYTES} bytes.`)
  }
}

function safeClearLimit(limit: number | undefined) {
  if (limit == null) return undefined
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_CLEAR_WALLET_EVENTS) {
    throw new Error(`Invalid clear limit: must be 1-${MAX_CLEAR_WALLET_EVENTS}.`)
  }
  return limit
}

const rowsArgs = {
  seedSecret: v.string(),
  rows: v.array(v.any()),
}

export const upsertMarkets = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    requireSafeSeedRows(rows)
    return ctx.runMutation(internal.seed.upsertMarkets, { rows })
  },
})

export const upsertDailyStats = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    requireSafeSeedRows(rows)
    return ctx.runMutation(internal.seed.upsertDailyStats, { rows })
  },
})

/**
 * Rebuild the `listMarketSnapshots` cache. Call ONCE after landing markets +
 * daily stats (the recompute is expensive; running it per-batch would waste work).
 */
export const rebuildMarketSnapshots = action({
  args: { seedSecret: v.string() },
  handler: async (ctx, { seedSecret }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runMutation(internal.markets.rebuildMarketSnapshots, {})
  },
})

export const upsertRevenue = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    requireSafeSeedRows(rows)
    return ctx.runMutation(internal.seed.upsertRevenue, { rows })
  },
})

export const upsertRisk = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    requireSafeSeedRows(rows)
    return ctx.runMutation(internal.seed.upsertRisk, { rows })
  },
})

export const upsertAllocation = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    requireSafeSeedRows(rows)
    return ctx.runMutation(internal.seed.upsertAllocation, { rows })
  },
})

export const upsertContent = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    requireSafeSeedRows(rows)
    return ctx.runMutation(internal.seed.upsertContent, { rows })
  },
})

export const clearWalletEvents = action({
  args: { seedSecret: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { seedSecret, limit }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runMutation(internal.seed.clearWalletEvents, { limit: safeClearLimit(limit) })
  },
})

export const insertWalletEvents = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    requireSafeSeedRows(rows)
    return ctx.runMutation(internal.seed.insertWalletEvents, { rows })
  },
})

/** Secret-gated seed-verification counts (the internal getCounts, but not anon-callable). */
export const getCounts = action({
  args: { seedSecret: v.string() },
  handler: async (ctx, { seedSecret }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runQuery(internal.seed.getCounts, {})
  },
})
