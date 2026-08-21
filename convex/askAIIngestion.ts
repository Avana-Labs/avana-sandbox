import { makeFunctionReference } from "convex/server"
import { v } from "convex/values"
import { createAskAIProviders } from "../app/lib/ask-ai/providers/registry"
import type { AskAIMarketRecord } from "../app/lib/ask-ai/providers/contracts"
import { internal } from "./_generated/api"
import { internalAction, internalMutation, internalQuery } from "./_generated/server"

const upsertRecords = makeFunctionReference<"mutation", { records: AskAIMarketRecord[] }, { upserted: number }>(
  "askAIIngestion:upsertRecordsMutation",
)

const sourceValidator = v.union(v.literal("coingecko"), v.literal("defillama"), v.literal("aave"))

// Keep each upsert transaction bounded so a large provider batch (DefiLlama can
// return hundreds of pools) does not push one mutation toward Convex's per-txn
// limits or hold a long OCC window.
const UPSERT_CHUNK_SIZE = 100

export const ingest = internalAction({
  args: { source: v.optional(sourceValidator) },
  handler: async (ctx, { source }) => {
    const providers = createAskAIProviders().filter((provider) => !source || provider.source === source)
    const results = []
    for (const provider of providers) {
      const startedAt = Date.now()
      try {
        const records = await provider.fetch()
        let upserted = 0
        for (let i = 0; i < records.length; i += UPSERT_CHUNK_SIZE) {
          const batch = records.slice(i, i + UPSERT_CHUNK_SIZE)
          const result = await ctx.runMutation(upsertRecords, { records: batch })
          upserted += result.upserted
        }
        const written = { upserted }
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

// Legacy provider sources no longer written by ingestion (the live set is
// coingecko/defillama/aave). Prod still holds thousands of stale `curve` rows
// from an earlier provider set; the schema union is kept wide until they are
// purged. Run `internal.askAIIngestion.purgeLegacyMarketSnapshots` once, then a
// follow-up can narrow the schema/query validators to the live three.
const LEGACY_MARKET_SOURCES = ["uniswap", "curve", "balancer"] as const

export const deleteLegacyMarketSnapshotBatch = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const budget = Math.min(Math.max(limit ?? 500, 1), 1_000)
    let deleted = 0
    for (const source of LEGACY_MARKET_SOURCES) {
      if (deleted >= budget) break
      const rows = await ctx.db
        .query("askAIMarketSnapshots")
        .withIndex("by_source_kind_key", (q) => q.eq("source", source))
        .take(budget - deleted)
      for (const row of rows) {
        await ctx.db.delete(row._id)
        deleted += 1
      }
    }
    return { deleted }
  },
})

export const purgeLegacyMarketSnapshots = internalAction({
  args: {},
  handler: async (ctx) => {
    let total = 0
    for (;;) {
      const { deleted } = await ctx.runMutation(internal.askAIIngestion.deleteLegacyMarketSnapshotBatch, {})
      total += deleted
      if (deleted === 0) break
    }
    return { deleted: total }
  },
})

// Per-source ingestion health from the run log: last status, record count, age,
// and error. Cheap (one indexed point read per source). Use for a monitor/alert
// so a wedged provider (stale or failing) surfaces before answers go empty.
export const providerHealth = internalQuery({
  args: {},
  handler: async (ctx) => {
    const sources = ["coingecko", "defillama", "aave"] as const
    const now = Date.now()
    const providers = await Promise.all(
      sources.map(async (source) => {
        const latest = await ctx.db
          .query("askAIMarketProviderRuns")
          .withIndex("by_source_completed", (q) => q.eq("source", source))
          .order("desc")
          .first()
        return {
          source,
          lastStatus: latest?.status ?? null,
          lastRecords: latest?.records ?? 0,
          lastCompletedAt: latest?.completedAt ?? null,
          ageMs: latest ? now - latest.completedAt : null,
          lastError: latest?.error ?? null,
        }
      }),
    )
    return { providers }
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
