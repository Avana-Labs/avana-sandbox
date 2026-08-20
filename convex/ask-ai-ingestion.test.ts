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

  test("one-time cleanup removes copied catalog rows and preserves provider records", async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    await t.run(async (ctx) => {
      await ctx.db.insert("askAIMarketSnapshots", {
        source: "defillama",
        kind: "token_price",
        key: "eth",
        payload: { symbol: "ETH", usd: 4_000, confidence: 1, status: "fresh" },
        fetchedAt: now,
      })
      await ctx.db.insert("askAIMarketSnapshots", {
        source: "defillama",
        kind: "token_price",
        key: "coingecko:ethereum",
        payload: { price: 4_000, decimals: 18, symbol: "ETH" },
        fetchedAt: now,
      })
    })

    await expect(t.mutation(internal.askAIIngestion.cleanupCopiedCatalogRecords, {})).resolves.toEqual({
      scanned: 2,
      deleted: 1,
    })
    await expect(t.query(api.askAITools.marketSnapshots, { limit: 10 })).resolves.toMatchObject([
      { key: "coingecko:ethereum" },
    ])
  })

  test("upserts normalized records and exposes a bounded source-aware read", async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    await t.mutation(internal.askAIIngestion.upsertRecordsMutation, {
      records: [
        {
          source: "coingecko",
          kind: "token_price",
          key: "ethereum",
          payload: { usd: 4_000 },
          fetchedAt: now - 100,
        },
      ],
    })
    await t.mutation(internal.askAIIngestion.upsertRecordsMutation, {
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
          source: "curve",
          kind: "dex_pool",
          key: "0xpool",
          payload: { totalLiquidity: 1_000_000 },
          fetchedAt: now - 10,
        },
      ],
    })

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
})
