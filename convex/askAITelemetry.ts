import { v } from "convex/values"
import { internalMutation, internalQuery } from "./_generated/server"

export const record = internalMutation({
  args: {
    ownerSubject: v.string(),
    threadId: v.string(),
    promptMessageId: v.string(),
    status: v.union(v.literal("complete"), v.literal("failed")),
    model: v.string(),
    provider: v.string(),
    durationMs: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    tools: v.array(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert("askAITelemetry", { ...args, createdAt: Date.now() }),
})

export const report = internalQuery({
  args: { since: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, { since, limit }) => {
    const rows = await ctx.db
      .query("askAITelemetry")
      .withIndex("by_created", (q) => (since ? q.gte("createdAt", since) : q))
      .order("desc")
      .take(Math.min(Math.max(limit ?? 200, 1), 1_000))
    const complete = rows.filter((row) => row.status === "complete")
    return {
      total: rows.length,
      failures: rows.length - complete.length,
      failureRate: rows.length ? (rows.length - complete.length) / rows.length : 0,
      averageDurationMs: complete.length
        ? complete.reduce((sum, row) => sum + row.durationMs, 0) / complete.length
        : 0,
      totalTokens: rows.reduce((sum, row) => sum + (row.totalTokens ?? 0), 0),
      rows,
    }
  },
})
