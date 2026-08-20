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

async function requestJson(fetcher: AskAIFetch, url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetcher(url, init)
  if (!response.ok) throw new Error(`Market provider request failed with ${response.status}`)
  return response.json()
}

abstract class LiveProvider implements AskAIMarketProvider {
  abstract readonly source: AskAIMarketSource
  constructor(protected readonly options: ProviderOptions) {}
  abstract fetch(): Promise<AskAIMarketRecord[]>

  protected graphUrl(name: string): string {
    const value = this.options.env[name]
    if (!value) throw new Error(`${name} is required when live market ingestion is enabled`)
    return value
  }

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
  protected async query(urlEnv: string, query: string): Promise<Record<string, unknown>> {
    const data = await requestJson(this.options.fetcher, this.graphUrl(urlEnv), {
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

export class UniswapGraphProvider extends GraphProvider {
  readonly source = "uniswap" as const
  async fetch() {
    const data = await this.query(
      "ASK_AI_UNISWAP_GRAPH_URL",
      `{ pools(first: 100, orderBy: totalValueLockedUSD, orderDirection: desc) { id feeTier liquidity totalValueLockedUSD volumeUSD token0 { id symbol } token1 { id symbol } } }`,
    )
    return this.rows(data, "pools", "dex_pool")
  }
}

export class BalancerGraphProvider extends GraphProvider {
  readonly source = "balancer" as const
  async fetch() {
    const data = await this.query(
      "ASK_AI_BALANCER_GRAPH_URL",
      `{ pools(first: 100, orderBy: totalLiquidity, orderDirection: desc) { id name symbol totalLiquidity totalSwapVolume tokens { address symbol balance weight } } }`,
    )
    return this.rows(data, "pools", "dex_pool")
  }
}

export class AaveProvider extends GraphProvider {
  readonly source = "aave" as const
  async fetch() {
    const data = await this.query(
      "ASK_AI_AAVE_GRAPH_URL",
      `{ reserves(first: 100) { id symbol name liquidityRate variableBorrowRate stableBorrowRate availableLiquidity totalLiquidity totalCurrentVariableDebt utilizationRate } }`,
    )
    return this.rows(data, "reserves", "lending_market")
  }
}

export class CurveProvider extends LiveProvider {
  readonly source = "curve" as const
  async fetch(): Promise<AskAIMarketRecord[]> {
    const url = this.options.env.ASK_AI_CURVE_API_URL ?? "https://api.curve.finance/v1/getPools/all/ethereum"
    const payload = await requestJson(this.options.fetcher, url)
    const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>).data : undefined
    const pools = data && typeof data === "object" ? (data as Record<string, unknown>).poolData : undefined
    if (!Array.isArray(pools)) return []
    return pools.flatMap((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []
      const row = raw as Record<string, unknown>
      const key = typeof row.address === "string" ? row.address : typeof row.id === "string" ? row.id : undefined
      return key ? [this.record("dex_pool", key, row)] : []
    })
  }
}

export function createLiveAskAIProviders(env: NodeJS.ProcessEnv, fetcher: AskAIFetch): AskAIMarketProvider[] {
  const options = { env, fetcher }
  return [
    new CoinGeckoProvider(options),
    new DefiLlamaProvider(options),
    new UniswapGraphProvider(options),
    new CurveProvider(options),
    new BalancerGraphProvider(options),
    new AaveProvider(options),
  ]
}
