import { unstable_cache } from "next/cache"
import { getLocalAssetIcon } from "@/app/lib/local-asset-icons"

export type HomeChain = {
  id: string
  name: string
  logo: string
  pools: number
  completed: number
  rewards: {
    points: string
  }
}

export type HomeHowItWorksStep = {
  number: string
  title: string
  description: string
}

const HOME_CHAINS: HomeChain[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    logo: getLocalAssetIcon("ETH") ?? "",
    pools: 12,
    completed: 2,
    rewards: { points: "65000" },
  },
  {
    id: "polygon",
    name: "Polygon",
    logo: getLocalAssetIcon("Polygon") ?? "",
    pools: 8,
    completed: 1,
    rewards: { points: "42500" },
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    logo: getLocalAssetIcon("ARB") ?? "",
    pools: 10,
    completed: 0,
    rewards: { points: "38000" },
  },
  {
    id: "optimism",
    name: "OP Mainnet",
    logo: getLocalAssetIcon("OP") ?? "",
    pools: 7,
    completed: 0,
    rewards: { points: "28500" },
  },
  {
    id: "base",
    name: "Base",
    logo: getLocalAssetIcon("Base") ?? "",
    pools: 6,
    completed: 0,
    rewards: { points: "25000" },
  },
  {
    id: "bnb",
    name: "BNB Chain",
    logo: getLocalAssetIcon("BNB") ?? "",
    pools: 9,
    completed: 0,
    rewards: { points: "35000" },
  },
  {
    id: "blast",
    name: "Blast",
    logo: getLocalAssetIcon("Blast") ?? "",
    pools: 5,
    completed: 0,
    rewards: { points: "85000" },
  },
  {
    id: "worldcoin",
    name: "World Chain",
    logo: getLocalAssetIcon("World Chain") ?? "",
    pools: 4,
    completed: 0,
    rewards: { points: "18500" },
  },
  {
    id: "avalanche",
    name: "Avalanche",
    logo: getLocalAssetIcon("Avalanche") ?? "",
    pools: 8,
    completed: 0,
    rewards: { points: "32000" },
  },
  {
    id: "zora",
    name: "Zora Network",
    logo: getLocalAssetIcon("Zora") ?? "",
    pools: 6,
    completed: 0,
    rewards: { points: "45000" },
  },
]

const HOME_HOW_IT_WORKS_STEPS: HomeHowItWorksStep[] = [
  {
    number: "01",
    title: "Deposit a Supported LP Position",
    description:
      "Deposit a supported LP position from venues such as Uniswap, Curve, Balancer, or Aerodrome while the liquidity remains active in the underlying AMM.",
  },
  {
    number: "02",
    title: "Evaluate Risk with Aave v4 Spokes",
    description:
      "Avana values each LP position using market-specific logic, oracle checks, and risk-adjusted collateral rules designed for active liquidity.",
  },
  {
    number: "03",
    title: "Borrow Without Leaving the Pool",
    description:
      "Borrow against the LP position while it continues earning trading fees, so capital stays both productive and borrowable at the same time.",
  },
]

/** Computes the static homepage snapshot once so the route can stream server HTML without client recomputation. */
export function buildHomeSnapshot() {
  const totalPools = HOME_CHAINS.reduce((sum, chain) => sum + chain.pools, 0)
  const completedPools = HOME_CHAINS.reduce((sum, chain) => sum + chain.completed, 0)
  const progressPercentage = (completedPools / totalPools) * 100
  const totalPoints = HOME_CHAINS.reduce((sum, chain) => sum + Number.parseInt(chain.rewards.points, 10), 0)

  return {
    chains: HOME_CHAINS,
    howItWorksSteps: HOME_HOW_IT_WORKS_STEPS,
    totalPools,
    completedPools,
    progressPercentage,
    totalPoints,
  }
}

export const getCachedHomeSnapshot = unstable_cache(async () => buildHomeSnapshot(), ["home-snapshot"], {
  revalidate: 3600,
  tags: ["home-snapshot"],
})
