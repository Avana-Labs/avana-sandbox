import { describe, expect, it } from "vitest"
import { askAIProviderMode, createAskAIProviders } from "../providers/registry"

describe("Ask AI provider registry", () => {
  it("uses deterministic fixtures until live ingestion is explicitly enabled", async () => {
    expect(askAIProviderMode({})).toBe("fixture")
    const providers = createAskAIProviders("fixture")
    expect(providers.map((provider) => provider.source)).toEqual([
      "coingecko",
      "defillama",
      "uniswap",
      "curve",
      "balancer",
      "aave",
    ])
    await expect(Promise.all(providers.map((provider) => provider.fetch()))).resolves.toEqual([[], [], [], [], [], []])
  })

  it("keeps every live adapter fail-closed until credentials are wired", async () => {
    expect(askAIProviderMode({ ASK_AI_ENABLE_LIVE_MARKET_INGESTION: "true" })).toBe("live-disabled")
    const [provider] = createAskAIProviders("live-disabled")
    await expect(provider.fetch()).rejects.toThrow("live ingestion is disabled")
  })
})
