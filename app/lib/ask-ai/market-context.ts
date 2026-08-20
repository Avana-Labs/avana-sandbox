import type { AskAIMarketRecord, AskAIMarketSource } from "./providers/contracts"

const SOURCE_LABELS: Record<string, string> = {
  coingecko: "CoinGecko",
  defillama: "DefiLlama",
  uniswap: "Uniswap",
  aave: "Aave",
  // Legacy sources retained only so historical snapshots still render; no longer ingested.
  curve: "Curve",
  balancer: "Balancer",
}

const ACTIVE_SOURCES: AskAIMarketSource[] = ["coingecko", "defillama", "aave"]

function numericField(payload: Record<string, unknown>, keys: string[]): { label: string; value: number } | null {
  for (const key of keys) {
    const raw = payload[key]
    const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN
    if (Number.isFinite(value)) return { label: key, value }
  }
  return null
}

function formatMetric(metric: { label: string; value: number } | null): string {
  if (!metric) return "snapshot available"
  const percent = /rate|apy|apr|utilization/i.test(metric.label)
  if (percent) return `${metric.label} ${metric.value.toLocaleString("en-US", { maximumFractionDigits: 4 })}`
  return `${metric.label} $${metric.value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function sourcesForAskAIPrompt(prompt: string): AskAIMarketSource[] | undefined {
  const normalized = prompt.toLowerCase()
  const sources = ACTIVE_SOURCES.filter(
    (source) => normalized.includes(source) || normalized.includes(SOURCE_LABELS[source].toLowerCase()),
  )
  return sources.length > 0 ? sources : undefined
}

export function answerFromAskAIMarketSnapshots(records: AskAIMarketRecord[]): string | null {
  if (records.length === 0) return null
  const lines = records.slice(0, 5).map((record) => {
    const metric = numericField(record.payload, [
      "usd",
      "price",
      "totalValueLockedUSD",
      "totalLiquidity",
      "availableLiquidity",
      "liquidityRate",
      "variableBorrowRate",
      "utilizationRate",
      "volumeUSD",
    ])
    return `- ${SOURCE_LABELS[record.source] ?? record.source} · ${record.key}: ${formatMetric(metric)} (fetched ${new Date(record.fetchedAt).toISOString()})`
  })
  return `Current cached market data:\n${lines.join("\n")}`
}
