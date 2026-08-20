import { describe, expect, it, vi } from "vitest"
import { askAIProviderMode, createAskAIProviders } from "../providers/registry"

describe("Ask AI provider registry", () => {
  it("uses deterministic fixtures until live ingestion is explicitly enabled", async () => {
    const fetcher = vi.fn()
    expect(askAIProviderMode({})).toBe("fixture")
    const providers = createAskAIProviders("fixture", {}, fetcher as unknown as typeof fetch)
    expect(providers.map((provider) => provider.source)).toEqual([
      "coingecko",
      "defillama",
      "uniswap",
      "curve",
      "balancer",
      "aave",
    ])
    await expect(Promise.all(providers.map((provider) => provider.fetch()))).resolves.toEqual([[], [], [], [], [], []])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("registers all live adapters only after the explicit enable flag", () => {
    expect(askAIProviderMode({ ASK_AI_ENABLE_LIVE_MARKET_INGESTION: "true" })).toBe("live")
    expect(
      createAskAIProviders("live", {}, vi.fn() as unknown as typeof fetch).map((provider) => provider.source),
    ).toEqual(["coingecko", "defillama", "uniswap", "curve", "balancer", "aave"])
  })

  it("normalizes CoinGecko prices without exposing credentials in records", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ethereum: { usd: 4_321.5, last_updated_at: 1_725_000_000 } }), {
        status: 200,
      }),
    )
    const [provider] = createAskAIProviders(
      "live",
      { ASK_AI_COINGECKO_IDS: "ethereum", COINGECKO_API_KEY: "secret" },
      fetcher as unknown as typeof fetch,
    )
    await expect(provider.fetch()).resolves.toEqual([
      expect.objectContaining({
        source: "coingecko",
        kind: "token_price",
        key: "ethereum",
        payload: { id: "ethereum", usd: 4_321.5 },
        sourceUpdatedAt: 1_725_000_000_000,
      }),
    ])
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("ids=ethereum"),
      expect.objectContaining({ headers: { "x-cg-pro-api-key": "secret" } }),
    )
  })

  it("fails closed when a configured Graph source has no endpoint", async () => {
    const providers = createAskAIProviders("live", {}, vi.fn() as unknown as typeof fetch)
    await expect(providers.find((provider) => provider.source === "uniswap")?.fetch()).rejects.toThrow(
      "ASK_AI_UNISWAP_GRAPH_URL is required",
    )
  })
})
