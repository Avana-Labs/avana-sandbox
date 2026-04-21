"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EnhancedGraph } from "@/app/components/enhanced-graph"
import { getDeterministicAmount } from "@/app/lib/deterministic"

type StrategyPool = {
  name: string
  apy: string
  tvl: string
  isUp: boolean
  change: number
}

type StrategySection = {
  title: string
  description: string
  badgeClassName: string
  badgeLabel: string
  accentClassName: string
  pools: StrategyPool[]
}

const STRATEGIES: StrategySection[] = [
  {
    title: "Conservative Strategy",
    description: "Stable assets with lower risk",
    badgeLabel: "4-8% APY Range",
    badgeClassName: "bg-blue-50 text-blue-700 text-lg px-4 py-2",
    accentClassName: "from-blue-500/5",
    pools: [
      { name: "Uniswap USDC-USDT", apy: "4.2%", tvl: "$2.1B", isUp: true, change: 0.8 },
      { name: "Aave USDC", apy: "5.1%", tvl: "$1.8B", isUp: true, change: 1.2 },
      { name: "Convex USDT", apy: "6.3%", tvl: "$950M", isUp: true, change: 2.1 },
      { name: "Chainlink USDC", apy: "7.2%", tvl: "$750M", isUp: false, change: 0.5 },
    ],
  },
  {
    title: "Moderate Strategy",
    description: "Balanced risk-reward ratio",
    badgeLabel: "8-15% APY Range",
    badgeClassName: "bg-purple-50 text-purple-700 text-lg px-4 py-2",
    accentClassName: "from-purple-500/5",
    pools: [
      { name: "Compound ETH-USDC", apy: "12.5%", tvl: "$890M", isUp: true, change: 3.2 },
      { name: "Rocket Pool stETH", apy: "9.8%", tvl: "$1.2B", isUp: true, change: 2.4 },
      { name: "Balancer ETH-DAI", apy: "14.2%", tvl: "$450M", isUp: false, change: 1.8 },
      { name: "Solana USDC", apy: "11.5%", tvl: "$680M", isUp: true, change: 4.2 },
    ],
  },
  {
    title: "Aggressive Strategy",
    description: "High risk, high potential returns",
    badgeLabel: "15-40% APY Range",
    badgeClassName: "bg-red-50 text-red-700 text-lg px-4 py-2",
    accentClassName: "from-red-500/5",
    pools: [
      { name: "Curve ETH-BTC", apy: "35.8%", tvl: "$120M", isUp: true, change: 12.5 },
      { name: "Balancer WETH-DAI", apy: "28.4%", tvl: "$85M", isUp: false, change: 8.2 },
      { name: "Pancakeswap BNB-USDT", apy: "42.1%", tvl: "$65M", isUp: true, change: 15.4 },
      { name: "Sushiswap ETH-USDC", apy: "31.6%", tvl: "$95M", isUp: false, change: 6.8 },
    ],
  },
]

function getPoolLogo(poolName: string) {
  if (poolName.includes("Uniswap")) return "https://cryptologos.cc/logos/uniswap-uni-logo.png"
  if (poolName.includes("Aave")) return "https://cryptologos.cc/logos/aave-aave-logo.png"
  if (poolName.includes("Convex")) return "https://cryptologos.cc/logos/convex-finance-cvx-logo.png"
  if (poolName.includes("Chainlink")) return "https://cryptologos.cc/logos/chainlink-link-logo.png"
  if (poolName.includes("Compound")) return "https://cryptologos.cc/logos/compound-comp-logo.png"
  if (poolName.includes("Rocket Pool")) return "https://cryptologos.cc/logos/rocket-pool-rpl-logo.png"
  if (poolName.includes("Balancer")) return "https://cryptologos.cc/logos/balancer-bal-logo.png"
  if (poolName.includes("Solana")) return "https://cryptologos.cc/logos/solana-sol-logo.png"
  if (poolName.includes("Curve")) return "https://cryptologos.cc/logos/curve-dao-token-crv-logo.png"
  if (poolName.includes("Pancakeswap")) return "https://cryptologos.cc/logos/pancakeswap-cake-logo.png"
  if (poolName.includes("Sushiswap")) return "https://cryptologos.cc/logos/sushiswap-sushi-logo.png"
  return "/placeholder.svg"
}

/** Deferred markets tab content for the homepage. */
export function HomeMarketsTab() {
  return (
    <div className="grid gap-6">
      {STRATEGIES.map((strategy) => (
        <Card key={strategy.title} className="p-6 relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${strategy.accentClassName} via-transparent to-transparent`} />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">{strategy.title}</h3>
                <p className="text-sm text-muted-foreground">{strategy.description}</p>
              </div>
              <Badge variant="secondary" className={strategy.badgeClassName}>
                {strategy.badgeLabel}
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {strategy.pools.map((pool) => (
                <Card key={pool.name} className="group hover:shadow-md transition-all">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Image
                        src={getPoolLogo(pool.name)}
                        alt={pool.name.split(" ")[0]}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">{pool.name.split(" ")[0]}</span>
                        <span className="font-medium">{pool.name.split(" ").slice(1).join(" ")}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Your lending</span>
                      <span className="font-data font-medium text-primary">
                        $
                        {getDeterministicAmount(
                          `${pool.name}-${strategy.title}-lending`,
                          strategy.title.includes("Conservative")
                            ? 5000
                            : strategy.title.includes("Moderate")
                              ? 15000
                              : 1000,
                          strategy.title.includes("Conservative")
                            ? 20000
                            : strategy.title.includes("Moderate")
                              ? 40000
                              : 6000,
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">APY</span>
                      <span className="font-data font-medium">{pool.apy}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">TVL</span>
                      <span className="font-data">{pool.tvl}</span>
                    </div>
                    <div className="h-[60px] -mx-2">
                      <EnhancedGraph isPositive={pool.isUp} points={12} height={60} />
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Earned</span>
                      <span className="font-data font-medium text-emerald-600">
                        +
                        $
                        {getDeterministicAmount(
                          `${pool.name}-${strategy.title}-earned`,
                          strategy.title.includes("Conservative")
                            ? 50
                            : strategy.title.includes("Moderate")
                              ? 200
                              : 500,
                          strategy.title.includes("Conservative")
                            ? 250
                            : strategy.title.includes("Moderate")
                              ? 1000
                              : 2000,
                        ).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
