import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { requireSandboxWallet } from "./auth"

export const getState = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    return ctx.db.query("sandboxRewards").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).unique()
  },
})

export const saveState = mutation({
  args: { wallet: v.string(), stateJson: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    if (args.stateJson.length > 1_000_000) throw new Error("REWARDS_STATE_TOO_LARGE")
    try {
      JSON.parse(args.stateJson)
    } catch {
      throw new Error("INVALID_REWARDS_STATE")
    }
    const existing = await ctx.db.query("sandboxRewards").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).unique()
    const updatedAt = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, { stateJson: args.stateJson, updatedAt })
      return existing._id
    }
    return ctx.db.insert("sandboxRewards", { wallet, stateJson: args.stateJson, updatedAt })
  },
})
