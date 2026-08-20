import type { AskAIMarketProvider, AskAIMarketRecord, AskAIMarketSource, AskAIProviderMode } from "./contracts"

const SOURCES: readonly AskAIMarketSource[] = ["coingecko", "defillama", "uniswap", "curve", "balancer", "aave"]

class DisabledLiveProvider implements AskAIMarketProvider {
  constructor(readonly source: AskAIMarketSource) {}

  async fetch(): Promise<AskAIMarketRecord[]> {
    throw new Error(
      `${this.source} live ingestion is disabled. Set ASK_AI_ENABLE_LIVE_MARKET_INGESTION=true and configure its API credentials first.`,
    )
  }
}

class FixtureProvider implements AskAIMarketProvider {
  constructor(readonly source: AskAIMarketSource) {}

  async fetch(): Promise<AskAIMarketRecord[]> {
    return []
  }
}

export function createAskAIProviders(mode: AskAIProviderMode): AskAIMarketProvider[] {
  return SOURCES.map((source) => (mode === "fixture" ? new FixtureProvider(source) : new DisabledLiveProvider(source)))
}

export function askAIProviderMode(env: NodeJS.ProcessEnv = process.env): AskAIProviderMode {
  return env.ASK_AI_ENABLE_LIVE_MARKET_INGESTION === "true" ? "live-disabled" : "fixture"
}
