import type { MultiplyMarketRecord } from "@/app/lib/multiply-engine"

export function getMultiplyMarketId(collateralSymbol: string, borrowSymbol: string) {
  return `${collateralSymbol}-${borrowSymbol}`.toLowerCase().replaceAll("_", "-")
}

export function listMultiplyMarketIds(catalog: MultiplyMarketRecord[]) {
  return catalog.map((market) => market.id)
}

export function resolveMultiplyMarketId(rawId: string, catalog: MultiplyMarketRecord[]) {
  const normalized = rawId.toLowerCase().replaceAll("_", "-")
  return catalog.find((market) => market.id === normalized)?.id ?? null
}
