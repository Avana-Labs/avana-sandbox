// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")

describe("Ask AI market ingestion", () => {
  test("is internal and can sync the canonical Convex cache without provider calls", async () => {
    // @ts-expect-error ingestion must never be publicly callable
    void api.askAIIngestion.ingest
    expect(internal.askAIIngestion.ingest).toBeDefined()

    const t = convexTest(schema, modules)
    await expect(t.action(internal.askAIIngestion.ingest, { source: "defillama" })).resolves.toEqual({
      canonicalSynced: true,
      providers: [],
    })
  })

  test("upserts normalized records and exposes a bounded source-aware read", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.askAIIngestion.upsertRecordsMutation, {
      records: [
        {
          source: "coingecko",
          kind: "token_price",
          key: "ethereum",
          payload: { usd: 4_000 },
          fetchedAt: 100,
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
          sourceUpdatedAt: 150,
          fetchedAt: 200,
        },
        {
          source: "curve",
          kind: "dex_pool",
          key: "0xpool",
          payload: { totalLiquidity: 1_000_000 },
          fetchedAt: 190,
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
        sourceUpdatedAt: 150,
        fetchedAt: 200,
      }),
    ])
  })
})
