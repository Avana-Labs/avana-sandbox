import { makeFunctionReference } from "convex/server"
import { v } from "convex/values"
import { createAskAIProviders } from "../app/lib/ask-ai/providers/registry"
import type { AskAIMarketRecord } from "../app/lib/ask-ai/providers/contracts"
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
    if (process.env.ASK_AI_ENABLE_LIVE_MARKET_INGESTION !== "true") {
      return { enabled: false, fetched: 0, upserted: 0 }
    }
    const providers = createAskAIProviders("live").filter((provider) => !source || provider.source === source)
    const records = (await Promise.all(providers.map((provider) => provider.fetch()))).flat()
    const result = await ctx.runMutation(upsertRecords, { records })
    return { enabled: true, fetched: records.length, upserted: result.upserted }
  },
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
