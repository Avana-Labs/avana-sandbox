// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")

describe("Ask AI market ingestion", () => {
  test("ingestion is internal", async () => {
    // @ts-expect-error ingestion must never be publicly callable
    void api.askAIIngestion.ingest
    expect(internal.askAIIngestion.ingest).toBeDefined()
  })

  test("upserts normalized records and exposes a bounded source-aware read", async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    await expect(
      t.mutation(internal.askAIIngestion.upsertRecordsMutation, {
        records: [
          {
            source: "coingecko",
            kind: "token_price",
            key: "ethereum",
            payload: { usd: 4_000 },
            fetchedAt: now - 100,
          },
        ],
      }),
    ).resolves.toEqual({ inserted: 1, updated: 0, unchanged: 0 })
    await expect(
      t.mutation(internal.askAIIngestion.upsertRecordsMutation, {
        records: [
          {
            source: "coingecko",
            kind: "token_price",
            key: "ethereum",
            payload: { usd: 4_321.5 },
            sourceUpdatedAt: now - 50,
            fetchedAt: now,
          },
          {
            source: "defillama",
            kind: "dex_pool",
            key: "defillama:0xpool",
            payload: { totalValueLockedUSD: 1_000_000 },
            fetchedAt: now - 10,
          },
        ],
      }),
    ).resolves.toEqual({ inserted: 1, updated: 1, unchanged: 0 })

    await expect(
      t.mutation(internal.askAIIngestion.upsertRecordsMutation, {
        records: [
          {
            source: "coingecko",
            kind: "token_price",
            key: "ethereum",
            payload: { usd: 4_321.5 },
            sourceUpdatedAt: now - 50,
            fetchedAt: now + 1_000,
          },
          {
            source: "defillama",
            kind: "dex_pool",
            key: "defillama:0xpool",
            payload: { totalValueLockedUSD: 1_000_000 },
            fetchedAt: now + 1_000,
          },
        ],
      }),
    ).resolves.toEqual({ inserted: 0, updated: 0, unchanged: 2 })

    await expect(
      t.query(api.askAITools.marketSnapshots, {
        sources: ["coingecko"],
        kind: "token_price",
        limit: 5,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        source: "coingecko",
        key: "ethereum",
        payload: { usd: 4_321.5 },
        sourceUpdatedAt: now - 50,
        fetchedAt: now,
      }),
    ])
  })

  test("purges legacy provider snapshots and leaves live sources intact", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const now = Date.now()
      for (const source of ["curve", "balancer", "uniswap"] as const)
        await ctx.db.insert("askAIMarketSnapshots", {
          source,
          kind: "dex_pool",
          key: `${source}:legacy`,
          payload: {},
          fetchedAt: now,
        })
      await ctx.db.insert("askAIMarketSnapshots", {
        source: "defillama",
        kind: "dex_pool",
        key: "defillama:live",
        payload: {},
        fetchedAt: now,
      })
    })

    await expect(t.action(internal.askAIIngestion.purgeLegacyMarketSnapshots, {})).resolves.toEqual({ deleted: 3 })

    const remaining = await t.run((ctx) => ctx.db.query("askAIMarketSnapshots").collect())
    expect(remaining.map((row) => row.source)).toEqual(["defillama"])
  })

  test("keeps one bounded health-state document per active provider", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.askAIIngestion.recordProviderRun, {
      source: "defillama",
      status: "success",
      records: 250,
      inserted: 250,
      updated: 0,
      unchanged: 0,
      startedAt: 100,
      completedAt: 200,
    })
    await t.mutation(internal.askAIIngestion.recordProviderRun, {
      source: "defillama",
      status: "success",
      records: 250,
      inserted: 0,
      updated: 0,
      unchanged: 250,
      startedAt: 300,
      completedAt: 400,
    })

    const states = await t.run((ctx) => ctx.db.query("askAIMarketProviderState").collect())
    expect(states).toHaveLength(1)
    expect(states[0]).toMatchObject({
      source: "defillama",
      records: 250,
      inserted: 0,
      updated: 0,
      unchanged: 250,
      lastCheckedAt: 400,
      lastChangedAt: 200,
      lastSuccessAt: 400,
    })
    await expect(t.run((ctx) => ctx.db.query("askAIMarketProviderRuns").collect())).resolves.toEqual([])
  })
})
