import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { requireSandboxWallet } from "./auth"

export const getState = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    return ctx.db
      .query("sandboxRewards")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .unique()
  },
})

export const saveState = mutation({
  args: {
    wallet: v.string(),
    stateJson: v.string(),
    expectedRevision: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    if (args.stateJson.length > 1_000_000) throw new Error("REWARDS_STATE_TOO_LARGE")
    try {
      JSON.parse(args.stateJson)
    } catch {
      throw new Error("INVALID_REWARDS_STATE")
    }
    const existing = await ctx.db
      .query("sandboxRewards")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .unique()
    const updatedAt = Date.now()
    if (existing) {
      const currentRevision = existing.revision ?? 0
      if (args.expectedRevision == null) {
        throw new Error("REVISION_REQUIRED: rewards state already exists; reload it and submit its expectedRevision.")
      }
      if (args.expectedRevision !== currentRevision) {
        return { id: existing._id, revision: currentRevision, stale: true }
      }
      const revision = currentRevision + 1
      await ctx.db.patch(existing._id, { stateJson: args.stateJson, updatedAt, revision })
      return { id: existing._id, revision, stale: false }
    }
    const id = await ctx.db.insert("sandboxRewards", {
      wallet,
      stateJson: args.stateJson,
      updatedAt,
      revision: 0,
    })
    return { id, revision: 0, stale: false }
  },
})
