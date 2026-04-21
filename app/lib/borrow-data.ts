import { unstable_cache } from "next/cache"
import { createSeededRandom } from "@/app/lib/deterministic"

export type BorrowPoolSeed = {
  name: string
  apy: number
  tvl: number
  volume24h: number
  chain: string
  isUp: boolean
  change: number
}

export type BorrowPool = BorrowPoolSeed & {
  protocol: string
}

export type BorrowProtocolMap = Record<string, BorrowPoolSeed[]>

export const BORROW_PROTOCOL_LOGOS = {
  Lido: "https://cryptologos.cc/logos/lido-dao-ldo-logo.png",
  PancakeSwap: "https://cryptologos.cc/logos/pancakeswap-cake-logo.png",
  "Convex Finance": "https://cryptologos.cc/logos/convex-finance-cvx-logo.png",
  "Rocket Pool": "https://cryptologos.cc/logos/rocket-pool-rpl-logo.png",
  "Uniswap V3": "https://cryptologos.cc/logos/uniswap-uni-logo.png",
  Curve: "https://cryptologos.cc/logos/curve-dao-token-crv-logo.png",
  Balancer: "https://cryptologos.cc/logos/balancer-bal-logo.png",
  Aave: "https://cryptologos.cc/logos/aave-aave-logo.png",
  Compound: "https://cryptologos.cc/logos/compound-comp-logo.png",
} as const

export const BORROW_ITEMS_PER_PAGE = 24

const BASE_PROTOCOLS: Record<string, BorrowPoolSeed[]> = {
  Lido: [
    { name: "stETH Pool", apy: 3.8, tvl: 21500000, volume24h: 5800000, chain: "Ethereum", isUp: true, change: 1.2 },
    { name: "wstETH-ETH", apy: 4.2, tvl: 18200000, volume24h: 4200000, chain: "Ethereum", isUp: true, change: 0.8 },
  ],
  PancakeSwap: [
    { name: "CAKE-BNB", apy: 24.5, tvl: 890000, volume24h: 460000, chain: "BSC", isUp: true, change: 3.2 },
    { name: "ETH-USDT", apy: 18.2, tvl: 650000, volume24h: 320000, chain: "BSC", isUp: false, change: 1.5 },
  ],
  "Convex Finance": [
    { name: "cvxCRV", apy: 42.8, tvl: 1250000, volume24h: 890000, chain: "Ethereum", isUp: true, change: 5.4 },
    { name: "3CRV", apy: 38.5, tvl: 980000, volume24h: 650000, chain: "Ethereum", isUp: true, change: 2.8 },
  ],
  "Rocket Pool": [
    { name: "rETH-ETH", apy: 5.2, tvl: 4500000, volume24h: 1200000, chain: "Ethereum", isUp: true, change: 0.6 },
    { name: "rETH-RPL", apy: 15.8, tvl: 890000, volume24h: 450000, chain: "Ethereum", isUp: false, change: 1.2 },
  ],
  "Uniswap V3": [
    { name: "ETH-USDC", apy: 15.5, tvl: 2500000, volume24h: 800000, chain: "Ethereum", isUp: true, change: 2.3 },
    { name: "ETH-USDT", apy: 14.2, tvl: 1800000, volume24h: 600000, chain: "Ethereum", isUp: true, change: 1.5 },
    { name: "BTC-ETH", apy: 12.8, tvl: 2200000, volume24h: 750000, chain: "Ethereum", isUp: false, change: 0.8 },
  ],
  Curve: [
    { name: "3Pool", apy: 8.5, tvl: 3200000, volume24h: 1200000, chain: "Ethereum", isUp: true, change: 0.5 },
    { name: "stETH-ETH", apy: 9.2, tvl: 2800000, volume24h: 950000, chain: "Ethereum", isUp: true, change: 1.2 },
    { name: "USDT-USDC-DAI", apy: 7.8, tvl: 1500000, volume24h: 580000, chain: "Ethereum", isUp: false, change: 0.3 },
  ],
  Balancer: [
    { name: "ETH-DAI-USDC", apy: 11.2, tvl: 1800000, volume24h: 620000, chain: "Ethereum", isUp: true, change: 1.8 },
    { name: "wBTC-ETH", apy: 10.5, tvl: 1200000, volume24h: 450000, chain: "Ethereum", isUp: false, change: 0.9 },
    { name: "BAL-ETH", apy: 16.8, tvl: 900000, volume24h: 320000, chain: "Ethereum", isUp: true, change: 3.2 },
  ],
  Aave: [
    { name: "ETH Supply", apy: 4.2, tvl: 4200000, volume24h: 1500000, chain: "Ethereum", isUp: true, change: 0.4 },
    { name: "USDC Supply", apy: 3.8, tvl: 3800000, volume24h: 1200000, chain: "Ethereum", isUp: true, change: 0.2 },
    { name: "DAI Supply", apy: 3.5, tvl: 2500000, volume24h: 800000, chain: "Ethereum", isUp: false, change: 0.1 },
  ],
  Compound: [
    { name: "ETH Market", apy: 3.9, tvl: 3500000, volume24h: 1100000, chain: "Ethereum", isUp: true, change: 0.3 },
    { name: "USDC Market", apy: 3.6, tvl: 3200000, volume24h: 950000, chain: "Ethereum", isUp: false, change: 0.2 },
    { name: "DAI Market", apy: 3.4, tvl: 2200000, volume24h: 720000, chain: "Ethereum", isUp: true, change: 0.4 },
  ],
}

/** Builds and caches mock market data once so the client route only hydrates interaction state. */
export function buildBorrowSnapshot() {
  const protocols: BorrowProtocolMap = {
    "All Pools": [],
    ...Object.fromEntries(
      Object.entries(BASE_PROTOCOLS).map(([protocol, pools]) => [protocol, pools.map((pool) => ({ ...pool }))]),
    ),
  }

  const chains = ["Ethereum", "BSC", "Arbitrum", "Optimism", "Polygon"]
  const tokens = ["ETH", "USDC", "USDT", "DAI", "BTC", "MATIC", "BNB", "ARB", "OP"]

  Object.keys(BASE_PROTOCOLS).forEach((protocol) => {
    const random = createSeededRandom(protocol)
    const baseApy = random() * 30 + 5
    const baseTvl = random() * 5000000 + 500000

    for (let index = 0; index < 10; index++) {
      const token1 = tokens[Math.floor(random() * tokens.length)]
      let token2 = tokens[Math.floor(random() * tokens.length)]

      while (token2 === token1) {
        token2 = tokens[Math.floor(random() * tokens.length)]
      }

      protocols[protocol].push({
        name: `${token1}-${token2}`,
        apy: baseApy + (random() * 10 - 5),
        tvl: baseTvl + (random() * 1000000 - 500000),
        volume24h: baseTvl * (random() * 0.4 + 0.1),
        chain: chains[Math.floor(random() * chains.length)],
        isUp: random() > 0.4,
        change: random() * 5 + 0.1,
      })
    }
  })

  const allPools: BorrowPool[] = Object.entries(protocols)
    .filter(([protocol]) => protocol !== "All Pools")
    .flatMap(([protocol, pools]) => pools.map((pool) => ({ ...pool, protocol })))

  protocols["All Pools"] = allPools.map(({ name, apy, tvl, volume24h, chain, isUp, change }) => ({
    name,
    apy,
    tvl,
    volume24h,
    chain,
    isUp,
    change,
  }))

  return {
    protocols,
    allPools,
    protocolLogos: BORROW_PROTOCOL_LOGOS,
    itemsPerPage: BORROW_ITEMS_PER_PAGE,
  }
}

export const getCachedBorrowSnapshot = unstable_cache(async () => buildBorrowSnapshot(), ["borrow-snapshot"], {
  revalidate: 3600,
  tags: ["borrow-snapshot"],
})
