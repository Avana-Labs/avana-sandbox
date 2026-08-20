import type { AskAIFetch, AskAIMarketProvider, AskAIMarketRecord, AskAIMarketSource } from "./contracts"

type ProviderOptions = { env: NodeJS.ProcessEnv; fetcher: AskAIFetch }

function finiteNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : undefined
}

function timestamp(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined
  const parsed = typeof value === "number" ? value : Date.parse(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

// Aave PercentValue/apy fields are decimal fractions (0.03 = 3%); surface them as percentages.
function percent(node: unknown): number | undefined {
  const value = node && typeof node === "object" ? (node as Record<string, unknown>).value : undefined
  const parsed = finiteNumber(value)
  return parsed === undefined ? undefined : parsed * 100
}

async function requestJson(fetcher: AskAIFetch, url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetcher(url, init)
  if (!response.ok) throw new Error(`Market provider request failed with ${response.status}`)
  return response.json()
}

abstract class LiveProvider implements AskAIMarketProvider {
  abstract readonly source: AskAIMarketSource
  constructor(protected readonly options: ProviderOptions) {}
  abstract fetch(): Promise<AskAIMarketRecord[]>

  protected record(kind: AskAIMarketRecord["kind"], key: string, payload: Record<string, unknown>, at?: number) {
    return { source: this.source, kind, key, payload, sourceUpdatedAt: at, fetchedAt: Date.now() }
  }
}

export class CoinGeckoProvider extends LiveProvider {
  readonly source = "coingecko" as const

  async fetch(): Promise<AskAIMarketRecord[]> {
    const ids = this.options.env.ASK_AI_COINGECKO_IDS ?? "bitcoin,ethereum,usd-coin"
    const baseUrl = this.options.env.ASK_AI_COINGECKO_URL ?? "https://api.coingecko.com/api/v3/simple/price"
    const url = new URL(baseUrl)
    url.searchParams.set("ids", ids)
    url.searchParams.set("vs_currencies", "usd")
    url.searchParams.set("include_last_updated_at", "true")
    const apiKey = this.options.env.COINGECKO_API_KEY
    const data = await requestJson(this.options.fetcher, url.toString(), {
      headers: apiKey ? { "x-cg-pro-api-key": apiKey } : undefined,
    })
    if (!data || typeof data !== "object" || Array.isArray(data)) return []
    return Object.entries(data).flatMap(([id, raw]) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []
      const row = raw as Record<string, unknown>
      const usd = finiteNumber(row.usd)
      if (usd === undefined) return []
      const updated = finiteNumber(row.last_updated_at)
      return [this.record("token_price", id, { id, usd }, updated === undefined ? undefined : updated * 1000)]
    })
  }
}

export class DefiLlamaProvider extends LiveProvider {
  readonly source = "defillama" as const

  async fetch(): Promise<AskAIMarketRecord[]> {
    const coins = this.options.env.ASK_AI_DEFILLAMA_COINS ?? "coingecko:bitcoin,coingecko:ethereum,coingecko:usd-coin"
    const baseUrl = this.options.env.ASK_AI_DEFILLAMA_URL ?? "https://coins.llama.fi/prices/current"
    const data = await requestJson(this.options.fetcher, `${baseUrl}/${coins}`)
    const coinRows = data && typeof data === "object" ? (data as Record<string, unknown>).coins : undefined
    if (!coinRows || typeof coinRows !== "object" || Array.isArray(coinRows)) return []
    return Object.entries(coinRows).flatMap(([key, raw]) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []
      const row = raw as Record<string, unknown>
      const price = finiteNumber(row.price)
      if (price === undefined) return []
      const at = finiteNumber(row.timestamp)
      return [this.record("token_price", key, { ...row, price }, at === undefined ? undefined : at * 1000)]
    })
  }
}

abstract class GraphProvider extends LiveProvider {
  protected async query(url: string, query: string): Promise<Record<string, unknown>> {
    const data = await requestJson(this.options.fetcher, url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    })
    if (!data || typeof data !== "object" || Array.isArray(data)) return {}
    const payload = data as Record<string, unknown>
    if (Array.isArray(payload.errors) && payload.errors.length > 0)
      throw new Error(`${this.source} GraphQL request failed`)
    return payload.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>) : {}
  }

  protected rows(data: Record<string, unknown>, field: string, kind: AskAIMarketRecord["kind"]): AskAIMarketRecord[] {
    const rows = data[field]
    if (!Array.isArray(rows)) return []
    return rows.flatMap((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []
      const row = raw as Record<string, unknown>
      const key = typeof row.id === "string" ? row.id : undefined
      return key ? [this.record(kind, key, row, timestamp(row.updatedAt))] : []
    })
  }
}

// Default Uniswap v3 Ethereum-mainnet subgraph on The Graph's decentralized network.
// Verify/override with ASK_AI_UNISWAP_SUBGRAPH_ID if the published id changes.
const UNISWAP_V3_MAINNET_SUBGRAPH_ID = "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV"

export class UniswapGraphProvider extends GraphProvider {
  readonly source = "uniswap" as const
  async fetch() {
    const data = await this.query(
      this.endpoint(),
      `{ pools(first: 100, orderBy: totalValueLockedUSD, orderDirection: desc) { id feeTier liquidity totalValueLockedUSD volumeUSD token0 { id symbol } token1 { id symbol } } }`,
    )
    return this.rows(data, "pools", "dex_pool")
  }

  // Prefer an explicit full gateway URL; otherwise build one from the API key + subgraph id
  // so operators only need to store UNISWAP_API_KEY.
  private endpoint(): string {
    const explicit = this.options.env.ASK_AI_UNISWAP_GRAPH_URL
    if (explicit) return explicit
    const apiKey = this.options.env.UNISWAP_API_KEY
    if (!apiKey) throw new Error("UNISWAP_API_KEY or ASK_AI_UNISWAP_GRAPH_URL is required for Uniswap ingestion")
    const subgraphId = this.options.env.ASK_AI_UNISWAP_SUBGRAPH_ID ?? UNISWAP_V3_MAINNET_SUBGRAPH_ID
    return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`
  }
}

// Aave v3's public GraphQL API — no key/auth required. Override with ASK_AI_AAVE_GRAPH_URL.
const AAVE_V3_API_URL = "https://api.v3.aave.com/graphql"

export class AaveProvider extends GraphProvider {
  readonly source = "aave" as const

  async fetch(): Promise<AskAIMarketRecord[]> {
    const endpoint = this.options.env.ASK_AI_AAVE_GRAPH_URL ?? AAVE_V3_API_URL
    const data = await this.query(
      endpoint,
      `{ markets(request: { chainIds: [1] }) { name reserves { underlyingToken { symbol name address } size { usd } supplyInfo { apy { value } } borrowInfo { apy { value } utilizationRate { value } availableLiquidity { usd } } } } }`,
    )
    const markets = Array.isArray(data.markets) ? data.markets : []
    return markets.flatMap((rawMarket) => {
      if (!rawMarket || typeof rawMarket !== "object" || Array.isArray(rawMarket)) return []
      const market = rawMarket as Record<string, unknown>
      const marketName = typeof market.name === "string" ? market.name : "aave"
      const reserves = Array.isArray(market.reserves) ? market.reserves : []
      return reserves.flatMap((rawReserve) => {
        if (!rawReserve || typeof rawReserve !== "object" || Array.isArray(rawReserve)) return []
        const reserve = rawReserve as Record<string, unknown>
        const token = (reserve.underlyingToken ?? {}) as Record<string, unknown>
        const address = typeof token.address === "string" ? token.address : undefined
        const symbol = typeof token.symbol === "string" ? token.symbol : undefined
        if (!address || !symbol) return []
        const size = (reserve.size ?? {}) as Record<string, unknown>
        const borrow = (reserve.borrowInfo ?? {}) as Record<string, unknown>
        const availableLiquidity = borrow.availableLiquidity as Record<string, unknown> | undefined
        return [
          this.record("lending_market", `${marketName}:${address}`, {
            market: marketName,
            symbol,
            address,
            name: typeof token.name === "string" ? token.name : symbol,
            sizeUsd: finiteNumber(size.usd),
            // Percentage-named keys so the cached-market formatter renders them as rates.
            supplyApyPct: percent((reserve.supplyInfo as Record<string, unknown> | undefined)?.apy),
            variableBorrowRate: percent(borrow.apy),
            utilizationRate: percent(borrow.utilizationRate),
            availableLiquidity: finiteNumber(availableLiquidity?.usd),
          }),
        ]
      })
    })
  }
}

export function createLiveAskAIProviders(env: NodeJS.ProcessEnv, fetcher: AskAIFetch): AskAIMarketProvider[] {
  const options = { env, fetcher }
  return [
    // CoinGecko disabled for now — DefiLlama covers token prices. Re-enable by uncommenting.
    // new CoinGeckoProvider(options),
    new DefiLlamaProvider(options),
    new UniswapGraphProvider(options),
    new AaveProvider(options),
  ]
}
