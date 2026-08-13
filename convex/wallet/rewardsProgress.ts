/**
 * Wallet-scoped rewards / quest progress. Feeds the rewards page tab lists
 * (which cards are Available / In-Progress / Completed / Claimed for the
 * connected wallet) and the balance-hero header (earned + claimable totals).
 *
 * Global quest catalog lives in `rewardsTasks`; this table just tracks per-
 * wallet state against it.
 */

import { v } from "convex/values"
import { internalMutation, query } from "../_generated/server"
import { requireSandboxWallet } from "../sandbox/auth"

const statusValidator = v.union(
  v.literal("locked"),
  v.literal("available"),
  v.literal("in-progress"),
  v.literal("completed"),
  v.literal("claimed"),
)

const rowFields = {
  taskId: v.string(),
  status: statusValidator,
  earnedAmount: v.number(),
  claimableAmount: v.number(),
  claimedAmount: v.number(),
  completedAt: v.optional(v.number()),
}

export const listForWallet = query({
  args: { wallet: v.string() },
  handler: async (ctx, { wallet }) => {
    const authed = await requireSandboxWallet(ctx, wallet)
    const rows = await ctx.db
      .query("walletRewardsProgress")
      .withIndex("by_wallet", (q) => q.eq("wallet", authed))
      .collect()
    return rows.map((row) => ({
      taskId: row.taskId,
      status: row.status,
      earnedAmount: row.earnedAmount,
      claimableAmount: row.claimableAmount,
      claimedAmount: row.claimedAmount,
      completedAt: row.completedAt,
    }))
  },
})

/** Aggregate totals — cheap to compute here so the client doesn't scan the array. */
export const summaryForWallet = query({
  args: { wallet: v.string() },
  handler: async (ctx, { wallet }) => {
    const authed = await requireSandboxWallet(ctx, wallet)
    const rows = await ctx.db
      .query("walletRewardsProgress")
      .withIndex("by_wallet", (q) => q.eq("wallet", authed))
      .collect()
    let earnedTotal = 0
    let claimableTotal = 0
    let claimedTotal = 0
    let completedCount = 0
    for (const row of rows) {
      earnedTotal += row.earnedAmount
      claimableTotal += row.claimableAmount
      claimedTotal += row.claimedAmount
      if (row.status === "completed" || row.status === "claimed") completedCount += 1
    }
    return { earnedTotal, claimableTotal, claimedTotal, completedCount, total: rows.length }
  },
})

export const upsertForWallet = internalMutation({
  args: {
    wallet: v.string(),
    rows: v.array(v.object(rowFields)),
  },
  handler: async (ctx, { wallet, rows }) => {
    const now = Date.now()
    for (const row of rows) {
      const existing = await ctx.db
        .query("walletRewardsProgress")
        .withIndex("by_wallet_task", (q) => q.eq("wallet", wallet).eq("taskId", row.taskId))
        .unique()
      if (existing) await ctx.db.patch(existing._id, { ...row, updatedAt: now })
      else await ctx.db.insert("walletRewardsProgress", { ...row, wallet, updatedAt: now })
    }
    return { written: rows.length }
  },
})

export const clearForWallet = internalMutation({
  args: { wallet: v.string() },
  handler: async (ctx, { wallet }) => {
    const rows = await ctx.db
      .query("walletRewardsProgress")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect()
    for (const row of rows) await ctx.db.delete(row._id)
    return { deleted: rows.length }
  },
})
