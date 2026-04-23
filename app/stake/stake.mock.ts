export type StakePool = {
  id: string
  name: string
  protocol: string
  chain: string
  currentApy: number
  tvl: number
  volume24h: number
  userPosition: number
  riskLevel: "Low" | "Medium" | "High"
  utilizationRate: number
  isUp: boolean
  change: number
}

export type StakeAsset = {
  id: string
  name: string
  balance: string
}

export const stakePools: StakePool[] = [
  {
    id: "1",
    name: "ETH-USDC",
    protocol: "Uniswap V3",
    chain: "Arbitrum",
    currentApy: 18.5,
    tvl: 3_200_000,
    volume24h: 1_200_000,
    userPosition: 250_000,
    riskLevel: "Low",
    utilizationRate: 78,
    isUp: true,
    change: 3.2,
  },
  {
    id: "2",
    name: "WBTC-ETH",
    protocol: "Curve",
    chain: "Optimism",
    currentApy: 22.3,
    tvl: 2_100_000,
    volume24h: 750_000,
    userPosition: 180_000,
    riskLevel: "Medium",
    utilizationRate: 88,
    isUp: true,
    change: 4.5,
  },
]

export const stakeAssets: StakeAsset[] = [
  { id: "usdc", name: "USDC", balance: "50,000" },
  { id: "eth", name: "ETH", balance: "25.5" },
  { id: "wbtc", name: "WBTC", balance: "1.8" },
]

export const stakeSteps = [
  "Select pool",
  "Choose asset",
  "Stake amount & lock",
  "Review & confirm",
] as const

export type StakeStep = (typeof stakeSteps)[number]

/** Mock hero totals — same shape as lend / perps / rewards balance rows. */
export const STAKING_BALANCE = {
  total: 14_400,
  gainUsd: 12.46,
  gainPct: 4.52,
} as const
