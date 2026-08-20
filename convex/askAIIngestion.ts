import { makeFunctionReference } from "convex/server"
import { v } from "convex/values"
import { createAskAIProviders } from "../app/lib/ask-ai/providers/registry"
import type { AskAIMarketRecord } from "../app/lib/ask-ai/providers/contracts"
import { internal } from "./_generated/api"
import { internalAction, internalMutation } from "./_generated/server"

const upsertRecords = makeFunctionReference<"mutation", { records: AskAIMarketRecord[] }, { upserted: number }>(
  "askAIIngestion:upsertRecordsMutation",
)

const sourceValidator = v.union(
  v.literal("coingecko"),
  v.literal("defillama"),
  v.literal("uniswap"),
  v.literal("curve"),
  v.literal("balancer"),
  v.literal("aave"),
)

export const ingest = internalAction({
  args: { source: v.optional(sourceValidator) },
  handler: async (ctx, { source }) => {
    const providers = createAskAIProviders().filter((provider) => !source || provider.source === source)
    const results = []
    for (const provider of providers) {
      const startedAt = Date.now()
      try {
        const records = await provider.fetch()
        const written = await ctx.runMutation(upsertRecords, { records })
        await ctx.runMutation(internal.askAIIngestion.recordProviderRun, {
          source: provider.source,
          status: "success",
          records: written.upserted,
          startedAt,
          completedAt: Date.now(),
        })
        results.push({ source: provider.source, status: "success" as const, records: written.upserted })
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown provider failure"
        await ctx.runMutation(internal.askAIIngestion.recordProviderRun, {
          source: provider.source,
          status: "failed",
          records: 0,
          error: message,
          startedAt,
          completedAt: Date.now(),
        })
        results.push({ source: provider.source, status: "failed" as const, records: 0, error: message })
      }
    }
    return { providers: results }
  },
})

export const recordProviderRun = internalMutation({
  args: {
    source: sourceValidator,
    status: v.union(v.literal("success"), v.literal("failed")),
    records: v.number(),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => ctx.db.insert("askAIMarketProviderRuns", args),
})

export const upsertRecordsMutation = internalMutation({
  args: {
    records: v.array(
      v.object({
        source: sourceValidator,
        kind: v.union(v.literal("token_price"), v.literal("dex_pool"), v.literal("lending_market")),
        key: v.string(),
        payload: v.any(),
        sourceUpdatedAt: v.optional(v.number()),
        fetchedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { records }) => {
    for (const record of records) {
      const existing = await ctx.db
        .query("askAIMarketSnapshots")
        .withIndex("by_source_kind_key", (q) =>
          q.eq("source", record.source).eq("kind", record.kind).eq("key", record.key),
        )
        .unique()
      if (existing) await ctx.db.patch(existing._id, record)
      else await ctx.db.insert("askAIMarketSnapshots", record)
    }
    return { upserted: records.length }
  },
})
