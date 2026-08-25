import { describe, expect, it, vi } from "vitest"
import { createAskAIProviders } from "../providers/registry"

describe("Ask AI provider registry", () => {
  it("production configuration can only register live adapters", () => {
    expect(createAskAIProviders({}, vi.fn() as unknown as typeof fetch).map((provider) => provider.source)).toEqual([
      "defillama",
      "aave",
    ])
  })

  it("normalizes only DefiLlama pools and leaves token prices to the canonical oracle", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
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
        ),
    )
    const providers = createAskAIProviders({ ASK_AI_DEFILLAMA_POOLS_LIMIT: "1" }, fetcher as unknown as typeof fetch)
    const records = (await providers.find((provider) => provider.source === "defillama")?.fetch()) ?? []
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
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
    expect(records.every((record) => record.kind === "dex_pool")).toBe(true)
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
