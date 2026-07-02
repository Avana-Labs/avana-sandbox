// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { afterEach, describe, expect, test, vi } from "vitest"
import schema from "../schema"
import { api, internal } from "../_generated/api"
import { PRICE_STALE_AFTER_MS } from "../prices"

const modules = import.meta.glob("../**/*.*s")

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("getPriceStatus surfaces price freshness", () => {
  test("no prices yet → stale (nothing served)", async () => {
    const t = convexTest(schema, modules)
    const status = await t.query(api.prices.getPriceStatus, {})
    expect(status.count).toBe(0)
    expect(status.updatedAt).toBeNull()
    expect(status.stale).toBe(true)
    expect(status.staleAfterMs).toBe(PRICE_STALE_AFTER_MS)
  })

  test("a fresh refresh is not stale", async () => {
    const t = convexTest(schema, modules)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ coins: { "coingecko:ethereum": { price: 3210.5, decimals: 18, confidence: 0.99 } } }),
      })) as unknown as typeof fetch,
    )
    await t.action(internal.prices.refreshPrices, {})

    const status = await t.query(api.prices.getPriceStatus, {})
    expect(status.count).toBeGreaterThan(0)
    expect(status.stale).toBe(false)
    expect(status.ageMs).not.toBeNull()
    expect(status.ageMs!).toBeLessThan(PRICE_STALE_AFTER_MS)
  })

  test("prices older than the threshold are flagged stale (cron stalled)", async () => {
    const t = convexTest(schema, modules)
    // Land a price whose updatedAt is well past the stale threshold.
    await t.mutation(internal.prices.upsertPrices, {
      rows: [
        {
          symbol: "eth",
          llamaId: "coingecko:ethereum",
          priceUsd: 3000,
          source: "defillama",
          updatedAt: Date.now() - (PRICE_STALE_AFTER_MS + 60_000),
        },
      ],
    })
    const status = await t.query(api.prices.getPriceStatus, {})
    expect(status.stale).toBe(true)
    expect(status.ageMs!).toBeGreaterThan(PRICE_STALE_AFTER_MS)
  })

  test("a failing refresh throws so the scheduled run is recorded failed", async () => {
    const t = convexTest(schema, modules)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch,
    )
    await expect(t.action(internal.prices.refreshPrices, {})).rejects.toThrow(/DefiLlama request failed: 503/)
  })

  test("a fetch that yields no usable prices is treated as a failure", async () => {
    const t = convexTest(schema, modules)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ coins: {} }) })) as unknown as typeof fetch,
    )
    await expect(t.action(internal.prices.refreshPrices, {})).rejects.toThrow(/no usable prices/)
  })
})
