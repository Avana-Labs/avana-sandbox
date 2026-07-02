// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { afterEach, describe, expect, test, vi } from "vitest"
import schema from "../schema"
import { api } from "../_generated/api"
import { internal } from "../_generated/api"

const modules = import.meta.glob("../**/*.*s")

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("refreshPrices is internal-only", () => {
  test("is registered as internal, not public", () => {
    // Compile-time proof: an internalAction is absent from the public `api` type but
    // present on `internal`. If refreshPrices were re-registered as a public `action`,
    // the @ts-expect-error would fail to error and the second line would not compile.
    // @ts-expect-error refreshPrices must not be publicly callable
    void api.prices.refreshPrices
    expect(internal.prices.refreshPrices).toBeDefined()
  })

  test("cron can still refresh prices via the internal reference", async () => {
    const t = convexTest(schema, modules)

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          coins: {
            "coingecko:ethereum": { price: 3210.5, decimals: 18, confidence: 0.99 },
          },
        }),
      })) as unknown as typeof fetch,
    )

    const result = await t.action(internal.prices.refreshPrices, {})
    expect(result.written).toBeGreaterThan(0)

    const prices = await t.query(api.prices.getPrices, {})
    const eth = prices.find((p) => p.symbol === "eth")
    expect(eth?.priceUsd).toBe(3210.5)
    expect(eth?.source).toBe("defillama")
  })
})
