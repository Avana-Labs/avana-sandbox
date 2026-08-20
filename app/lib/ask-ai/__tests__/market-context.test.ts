import { describe, expect, it } from "vitest"
import { answerFromAskAIMarketSnapshots, sourcesForAskAIPrompt } from "../market-context"

describe("Ask AI external market context", () => {
  it("routes named provider prompts to the matching cache source", () => {
    expect(sourcesForAskAIPrompt("Compare Uniswap and Aave liquidity")).toEqual(["uniswap", "aave"])
    // Retired providers are no longer ingested, so they never route to a live cache source.
    expect(sourcesForAskAIPrompt("Compare Curve and Balancer liquidity")).toBeUndefined()
    expect(sourcesForAskAIPrompt("What is the ETH price?")).toBeUndefined()
  })

  it("formats normalized provider snapshots with source and freshness", () => {
    const answer = answerFromAskAIMarketSnapshots([
      {
        source: "coingecko",
        kind: "token_price",
        key: "ethereum",
        payload: { usd: 4_321.5 },
        fetchedAt: Date.parse("2026-08-20T12:00:00.000Z"),
      },
    ])
    expect(answer).toContain("CoinGecko · ethereum: usd $4,321.50")
    expect(answer).toContain("fetched 2026-08-20T12:00:00.000Z")
  })

  it("returns no market section when ingestion has not populated the cache", () => {
    expect(answerFromAskAIMarketSnapshots([])).toBeNull()
  })
})
