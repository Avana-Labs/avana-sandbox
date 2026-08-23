import { describe, expect, it, vi } from "vitest"
import { createAskAIProviders } from "../providers/registry"
import { CoinGeckoProvider } from "../providers/live-adapters"

describe("Ask AI provider registry", () => {
  it("production configuration can only register live adapters", () => {
    expect(createAskAIProviders({}, vi.fn() as unknown as typeof fetch).map((provider) => provider.source)).toEqual([
      "defillama",
      "aave",
    ])
  })

  it("normalizes CoinGecko prices without exposing credentials in records", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ethereum: { usd: 4_321.5, last_updated_at: 1_725_000_000 } }), {
        status: 200,
      }),
    )
    // CoinGecko is disabled in the live registry (DefiLlama covers prices); the adapter itself
    // still normalizes correctly, so exercise it directly.
    const provider = new CoinGeckoProvider({
      env: { ASK_AI_COINGECKO_IDS: "ethereum", COINGECKO_API_KEY: "secret" } as NodeJS.ProcessEnv,
      fetcher: fetcher as unknown as typeof fetch,
    })
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

  it("normalizes DefiLlama pools (top TVL, capped) into dex_pool records", async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.includes("yields.llama.fi")
        ? new Response(
            JSON.stringify({
              data: [
                { pool: "small", project: "curve", chain: "Ethereum", symbol: "USDC-DAI", tvlUsd: 1_000, apy: 2 },
                {
                  pool: "big",
                  project: "uniswap-v3",
                  chain: "Ethereum",
                  symbol: "WETH-USDC",
                  tvlUsd: 9_000_000,
                  apy: 12,
                },
              ],
            }),
            { status: 200 },
          )
        : new Response(JSON.stringify({ coins: {} }), { status: 200 }),
    )
    const providers = createAskAIProviders({ ASK_AI_DEFILLAMA_POOLS_LIMIT: "1" }, fetcher as unknown as typeof fetch)
    const records = (await providers.find((provider) => provider.source === "defillama")?.fetch()) ?? []
    const pools = records.filter((record) => record.kind === "dex_pool")
    expect(pools).toHaveLength(1)
    expect(pools[0]).toMatchObject({
      source: "defillama",
      kind: "dex_pool",
      key: "defillama:big",
      payload: expect.objectContaining({
        project: "uniswap-v3",
        tvlUsd: 9_000_000,
        totalValueLockedUSD: 9_000_000,
        apy: 12,
      }),
    })
  })

  it("reads Aave reserves from the public v3 API without a key", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            markets: [
              {
                name: "AaveV3Ethereum",
                reserves: [
                  {
                    underlyingToken: { symbol: "USDC", name: "USD Coin", address: "0xusdc" },
                    size: { usd: "1000000" },
                    supplyInfo: { apy: { value: "0.03" } },
                    borrowInfo: {
                      apy: { value: "0.05" },
                      utilizationRate: { value: "0.8" },
                      availableLiquidity: { usd: "500000" },
                    },
                  },
                ],
              },
            ],
          },
        }),
        { status: 200 },
      ),
    )
    const providers = createAskAIProviders({}, fetcher as unknown as typeof fetch)
    const records = await providers.find((provider) => provider.source === "aave")?.fetch()
    expect(fetcher).toHaveBeenCalledWith("https://api.v3.aave.com/graphql", expect.objectContaining({ method: "POST" }))
    expect(records?.[0]).toMatchObject({
      source: "aave",
      kind: "lending_market",
      key: "AaveV3Ethereum:0xusdc",
      payload: expect.objectContaining({
        symbol: "USDC",
        sizeUsd: 1_000_000,
        supplyApyPct: 3,
        variableBorrowRate: 5,
        utilizationRate: 80,
        availableLiquidity: 500_000,
      }),
    })
  })
})
