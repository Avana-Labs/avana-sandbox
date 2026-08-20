export type AskAIMarketSource = "coingecko" | "defillama" | "aave"

export type AskAIMarketRecord = {
  source: AskAIMarketSource
  kind: "token_price" | "dex_pool" | "lending_market"
  key: string
  payload: Record<string, unknown>
  sourceUpdatedAt?: number
  fetchedAt: number
}

export interface AskAIMarketProvider {
  readonly source: AskAIMarketSource
  fetch(): Promise<AskAIMarketRecord[]>
}

export type AskAIFetch = typeof fetch
