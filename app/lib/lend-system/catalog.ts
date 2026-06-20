import { LEND_ASSET_GROUPS } from "@/app/lib/data/mock/shared/lend/asset-groups"
import { calculateAvailableLiquidity, calculateTotalApy, calculateUtilization } from "@/app/lib/lend-engine/formulas"
import { INITIAL_LIQUIDITY_INDEX } from "@/app/lib/lend-engine/constants"
import type { LendMarket, LendRiskTier } from "@/app/lib/lend-engine/types"

const ASSET_PRICES_USD: Record<string, number> = {
  EURC: 1.08,
  ETH: 3500,
  BTC: 95000,
  WBTC: 95000,
  CBBTC: 96000,
  CBETH: 3600,
  STETH: 3650,
  WSTETH: 3800,
  RETH: 3700,
  WEETH: 3650,
  AAVE: 280,
  UNI: 12,
  CRV: 0.5,
  LDO: 2,
  BAL: 3.3,
  GNO: 220,
  AERO: 2.25,
  ARB: 0.6,
  OP: 1.46,
  GHO: 1,
  FRXUSD: 1,
  USDG: 1,
  RLUSD: 1,
}

const SPEC_UTILIZATION: Record<string, number> = {
  EURC: 0.298,
  FRXUSD: 0.1537,
  GHO: 0.6411,
  USDG: 0.1643,
  ETH: 0.6133,
  WSTETH: 0.6571,
  CBBTC: 0.6333,
  WBTC: 0.6778,
  AAVE: 0.5851,
  UNI: 0.6125,
}

const SPEC_SUPPLY_APY: Record<string, number> = {
  EURC: 0.0049,
  GHO: 0.0299,
  ETH: 0.0382,
  WSTETH: 0.0514,
  CBBTC: 0.0425,
  WBTC: 0.0348,
  AAVE: 0.076,
  UNI: 0.064,
}

const SPEC_REWARDS_APY: Record<string, number> = {
  FRXUSD: 0.01,
  USDG: 0.0125,
}

function reserveFactorForGroup(title: string): number {
  if (title === "Stablecoins") return 0.1
  if (title === "Ethereum-Based") return 0.15
  if (title === "Bitcoin Based") return 0.2
  return 0.2
}

function riskTierForGroup(title: string): LendRiskTier {
  if (title === "Stablecoins") return "low"
  if (title === "Ethereum-Based") return "medium"
  if (title === "Bitcoin Based") return "medium"
  return "high"
}

function toMarketId(symbol: string) {
  return symbol.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function buildMarketFromRow(
  row: (typeof LEND_ASSET_GROUPS)[number]["rows"][number],
  rank: number,
  groupTitle: string,
  now: number,
): LendMarket {
  const symbol = row.symbol.toUpperCase()
  const marketId = toMarketId(row.symbol)
  const totalSupplied = row.totalDepositsValue
  const availableLiquidity = row.availableLiquidityValue
  const totalBorrowed = Math.max(0, totalSupplied - availableLiquidity)
  const utilization =
    SPEC_UTILIZATION[symbol] ?? calculateUtilization(totalBorrowed, totalSupplied)
  const rewardsApy = SPEC_REWARDS_APY[symbol] ?? 0
  const totalDisplayApy = row.apyValue / 100
  const supplyApy = SPEC_SUPPLY_APY[symbol] ?? Math.max(0, totalDisplayApy - rewardsApy)
  const totalApy = calculateTotalApy(supplyApy, rewardsApy)
  const assetPriceUsd = ASSET_PRICES_USD[symbol] ?? 1

  return {
    marketId,
    chainId: 1,
    rank,
    asset: { symbol: row.symbol, name: row.name, priceUsd: assetPriceUsd },
    assetPriceUsd,
    supplyApy,
    rewardsApy,
    totalApy,
    totalSupplied,
    totalBorrowed,
    availableLiquidity: calculateAvailableLiquidity(totalSupplied, totalBorrowed),
    utilization,
    reserveFactor: reserveFactorForGroup(groupTitle),
    status: "active",
    riskTier: riskTierForGroup(groupTitle),
    liquidityIndex: INITIAL_LIQUIDITY_INDEX,
    lastAccrualTimestamp: now,
    priceUpdatedAt: now,
  }
}

const NOW = Date.UTC(2026, 5, 19)

export const LEND_MARKET_CATALOG: LendMarket[] = LEND_ASSET_GROUPS.flatMap((group) => group.rows).map((row, index) => {
  const groupTitle = LEND_ASSET_GROUPS.find((group) => group.rows.includes(row))?.title ?? "Other Assets"
  return buildMarketFromRow(row, index + 1, groupTitle, NOW)
})

export function buildLendCatalogMarketsRecord(now = NOW): Record<string, LendMarket> {
  return Object.fromEntries(
    LEND_ASSET_GROUPS.flatMap((group) => group.rows).map((row, index) => {
      const groupTitle = LEND_ASSET_GROUPS.find((entry) => entry.rows.includes(row))?.title ?? "Other Assets"
      const market = buildMarketFromRow(row, index + 1, groupTitle, now)
      return [market.marketId, market] as const
    }),
  )
}

export function getLendMarketById(marketId: string) {
  return LEND_MARKET_CATALOG.find((market) => market.marketId === marketId.toLowerCase()) ?? null
}

export function resolveLendMarketId(symbol: string) {
  return symbol.toLowerCase().replace(/[^a-z0-9]/g, "")
}
