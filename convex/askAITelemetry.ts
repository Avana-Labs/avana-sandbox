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
    routeIntent: v.optional(v.string()),
    toolBudget: v.optional(v.number()),
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
    const generationsByPrompt = new Map<string, number>()
    for (const row of rows)
      generationsByPrompt.set(row.promptMessageId, (generationsByPrompt.get(row.promptMessageId) ?? 0) + 1)
    return {
      total: rows.length,
      failures: rows.length - complete.length,
      failureRate: rows.length ? (rows.length - complete.length) / rows.length : 0,
      averageDurationMs: complete.length ? complete.reduce((sum, row) => sum + row.durationMs, 0) / complete.length : 0,
      totalTokens: rows.reduce((sum, row) => sum + (row.totalTokens ?? 0), 0),
      duplicatePromptMessageIds: [...generationsByPrompt.entries()]
        .filter(([, count]) => count > 1)
        .map(([promptMessageId]) => promptMessageId),
      toolBudgetViolations: rows.filter(
        (row) => row.toolBudget !== undefined && row.tools.length > row.toolBudget,
      ).length,
      cachedPriceWebSearchViolations: rows.filter(
        (row) => row.routeIntent === "market" && row.tools.includes("web_search"),
      ).length,
      priceLookupTokenViolations: rows.filter(
        (row) => row.routeIntent === "market" && (row.totalTokens ?? 0) > 2_000,
      ).length,
      rows,
    }
  },
})
