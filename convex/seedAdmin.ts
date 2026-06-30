import { v } from "convex/values"
import { action } from "./_generated/server"
import { internal } from "./_generated/api"

function requireSeedSecret(seedSecret: string) {
  const expected = process.env.CONVEX_SEED_SECRET
  if (!expected || seedSecret !== expected) {
    throw new Error("Unauthorized seed write")
  }
}

const rowsArgs = {
  seedSecret: v.string(),
  rows: v.array(v.any()),
}

export const upsertMarkets = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runMutation(internal.seed.upsertMarkets, { rows })
  },
})

export const upsertDailyStats = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runMutation(internal.seed.upsertDailyStats, { rows })
  },
})

export const upsertRevenue = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runMutation(internal.seed.upsertRevenue, { rows })
  },
})

export const upsertRisk = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runMutation(internal.seed.upsertRisk, { rows })
  },
})

export const upsertAllocation = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runMutation(internal.seed.upsertAllocation, { rows })
  },
})

export const upsertContent = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runMutation(internal.seed.upsertContent, { rows })
  },
})

export const clearWalletEvents = action({
  args: { seedSecret: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { seedSecret, limit }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runMutation(internal.seed.clearWalletEvents, { limit })
  },
})

export const insertWalletEvents = action({
  args: rowsArgs,
  handler: async (ctx, { seedSecret, rows }): Promise<unknown> => {
    requireSeedSecret(seedSecret)
    return ctx.runMutation(internal.seed.insertWalletEvents, { rows })
  },
})
