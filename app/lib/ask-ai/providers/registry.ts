import type {
  AskAIFetch,
  AskAIMarketProvider,
  AskAIMarketRecord,
  AskAIMarketSource,
  AskAIProviderMode,
} from "./contracts"
import { createLiveAskAIProviders } from "./live-adapters"

const SOURCES: readonly AskAIMarketSource[] = ["coingecko", "defillama", "uniswap", "curve", "balancer", "aave"]

class FixtureProvider implements AskAIMarketProvider {
  constructor(readonly source: AskAIMarketSource) {}

  async fetch(): Promise<AskAIMarketRecord[]> {
    return []
  }
}

export function createAskAIProviders(
  mode: AskAIProviderMode,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: AskAIFetch = fetch,
): AskAIMarketProvider[] {
  return mode === "fixture"
    ? SOURCES.map((source) => new FixtureProvider(source))
    : createLiveAskAIProviders(env, fetcher)
}

export function askAIProviderMode(env: NodeJS.ProcessEnv = process.env): AskAIProviderMode {
  return env.ASK_AI_ENABLE_LIVE_MARKET_INGESTION === "true" ? "live" : "fixture"
}
