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

describe("refreshPrices rejects insane/low-confidence quotes (C1)", () => {
  // TOKEN_LLAMA_IDS coin ids (mainnet addresses / coingecko slugs) for the tokens we exercise.
  const IDS = {
    usdc: "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdt: "ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7",
    dai: "ethereum:0x6B175474E89094C44Da98b954EedeAC495271d0F",
    weth: "ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    eth: "coingecko:ethereum",
  } as const

  test("drops NaN / 0 / negative / low-confidence rows, keeps valid ones", async () => {
    const t = convexTest(schema, modules)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          coins: {
            // Valid rows — must be stored.
            [IDS.usdc]: { price: 1.0, decimals: 6, confidence: 0.99 },
            [IDS.eth]: { price: 3210.5, decimals: 18, confidence: 0.98 },
            // Bad rows — must all be dropped.
            [IDS.usdt]: { price: NaN, decimals: 6, confidence: 0.99 },
            [IDS.dai]: { price: 0, decimals: 18, confidence: 0.99 },
            [IDS.weth]: { price: -5, decimals: 18, confidence: 0.99 },
          },
        }),
      })) as unknown as typeof fetch,
    )

    const result = await t.action(internal.prices.refreshPrices, {})
    // Only usdc + eth survive.
    expect(result.written).toBe(2)

    const prices = await t.query(api.prices.getPrices, {})
    const bySymbol = new Map(prices.map((p) => [p.symbol, p]))
    expect(bySymbol.get("usdc")?.priceUsd).toBe(1.0)
    expect(bySymbol.get("eth")?.priceUsd).toBe(3210.5)
    // The insane / rejected quotes were never written.
    expect(bySymbol.has("usdt")).toBe(false)
    expect(bySymbol.has("dai")).toBe(false)
    expect(bySymbol.has("weth")).toBe(false)
  })

  test("drops a row whose confidence is below the threshold", async () => {
    const t = convexTest(schema, modules)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          coins: {
            [IDS.usdc]: { price: 1.0, decimals: 6, confidence: 0.99 },
            // Finite, positive price but a shaky quote — DefiLlama confidence well under 0.8.
            [IDS.eth]: { price: 3210.5, decimals: 18, confidence: 0.4 },
          },
        }),
      })) as unknown as typeof fetch,
    )

    const result = await t.action(internal.prices.refreshPrices, {})
    expect(result.written).toBe(1)

    const prices = await t.query(api.prices.getPrices, {})
    expect(prices.map((p) => p.symbol)).toContain("usdc")
    expect(prices.map((p) => p.symbol)).not.toContain("eth")
  })

  test("missing confidence is treated as acceptable (kept)", async () => {
    const t = convexTest(schema, modules)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          coins: {
            // No confidence field at all — a valid finite/positive price must survive.
            [IDS.usdc]: { price: 1.0, decimals: 6 },
          },
        }),
      })) as unknown as typeof fetch,
    )

    const result = await t.action(internal.prices.refreshPrices, {})
    expect(result.written).toBe(1)
    const prices = await t.query(api.prices.getPrices, {})
    expect(prices.map((p) => p.symbol)).toContain("usdc")
  })

  test("if EVERY row is invalid the empty-batch throw still fires", async () => {
    const t = convexTest(schema, modules)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          coins: {
            [IDS.usdc]: { price: 0, decimals: 6, confidence: 0.99 },
            [IDS.usdt]: { price: NaN, decimals: 6, confidence: 0.99 },
            [IDS.dai]: { price: -1, decimals: 18, confidence: 0.99 },
            [IDS.eth]: { price: 3210.5, decimals: 18, confidence: 0.1 },
          },
        }),
      })) as unknown as typeof fetch,
    )

    // No usable rows survive filtering → the run is flagged rather than silently kept stale.
    await expect(t.action(internal.prices.refreshPrices, {})).rejects.toThrow(/no usable prices/)
  })
})
