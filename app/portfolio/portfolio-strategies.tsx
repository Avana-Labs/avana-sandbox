"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EnhancedGraph } from "@/app/components/enhanced-graph"
import { getDeterministicAmount } from "@/app/lib/deterministic"

type StrategyPool = {
  name: string
  apy: string
  tvl: string
  isUp: boolean
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
    badgeLabel: "4-8% APY range",
    badgeClassName:
      "rounded-xs border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-blue-700 dark:text-blue-400",
    accentClassName: "from-blue-500/[0.03]",
    pools: [
      { name: "Uniswap USDC-USDT", apy: "4.2%", tvl: "$2.1B", isUp: true },
      { name: "Aave USDC", apy: "5.1%", tvl: "$1.8B", isUp: true },
      { name: "Convex USDT", apy: "6.3%", tvl: "$950M", isUp: true },
      { name: "Chainlink USDC", apy: "7.2%", tvl: "$750M", isUp: false },
    ],
  },
  {
    title: "Moderate Strategy",
    description: "Balanced risk-reward ratio",
    badgeLabel: "8-15% APY range",
    badgeClassName:
      "rounded-xs border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-indigo-700 dark:text-indigo-400",
    accentClassName: "from-indigo-500/[0.03]",
    pools: [
      { name: "Compound ETH-USDC", apy: "12.5%", tvl: "$890M", isUp: true },
      { name: "Rocket Pool stETH", apy: "9.8%", tvl: "$1.2B", isUp: true },
      { name: "Balancer ETH-DAI", apy: "14.2%", tvl: "$450M", isUp: false },
      { name: "Solana USDC", apy: "11.5%", tvl: "$680M", isUp: true },
    ],
  },
  {
    title: "Aggressive Strategy",
    description: "High risk, high potential returns",
    badgeLabel: "15-40% APY range",
    badgeClassName:
      "rounded-xs border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-rose-700 dark:text-rose-400",
    accentClassName: "from-rose-500/[0.03]",
    pools: [
      { name: "Curve ETH-BTC", apy: "35.8%", tvl: "$120M", isUp: true },
      { name: "Balancer WETH-DAI", apy: "28.4%", tvl: "$85M", isUp: false },
      { name: "Pancakeswap BNB-USDT", apy: "42.1%", tvl: "$65M", isUp: true },
      { name: "Sushiswap ETH-USDC", apy: "31.6%", tvl: "$95M", isUp: false },
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

export function PortfolioStrategies() {
  return (
    <section className="mb-8 space-y-6">
      <div className="space-y-1">
        <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">Strategy Buckets</h2>
        <p className="text-[12.5px] text-muted-foreground">
          Strategy groupings for portfolio construction across conservative, moderate, and aggressive LP allocations.
        </p>
      </div>

      <div className="grid gap-6">
        {STRATEGIES.map((strategy) => (
          <Card key={strategy.title} className="relative overflow-hidden border-border bg-surface-raised p-5 shadow-elev-1">
            <div className={`absolute inset-0 bg-gradient-to-br ${strategy.accentClassName} via-transparent to-transparent`} />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-medium tracking-tight text-foreground">{strategy.title}</h3>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">{strategy.description}</p>
                </div>
                <Badge variant="secondary" className={strategy.badgeClassName}>
                  {strategy.badgeLabel}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {strategy.pools.map((pool) => (
                  <Card key={pool.name} className="group border-border bg-surface-inset shadow-none transition-colors hover:bg-surface-raised">
                    <CardContent className="space-y-2 p-3.5">
                      <div className="mb-1 flex items-center gap-2">
                        <Image
                          src={getPoolLogo(pool.name)}
                          alt={pool.name.split(" ")[0]}
                          width={18}
                          height={18}
                          className="rounded-xs border border-border bg-surface-raised"
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                            {pool.name.split(" ")[0]}
                          </span>
                          <span className="truncate text-[12.5px] font-medium text-foreground">
                            {pool.name.split(" ").slice(1).join(" ")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-muted-foreground">Portfolio alloc.</span>
                        <span className="font-data font-medium tabular-nums text-accent-primary">
                          $
                          {getDeterministicAmount(
                            `${pool.name}-${strategy.title}-portfolio`,
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

                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-muted-foreground">APY</span>
                        <span className="font-data font-medium tabular-nums text-foreground">{pool.apy}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-muted-foreground">TVL</span>
                        <span className="font-data tabular-nums text-foreground">{pool.tvl}</span>
                      </div>

                      <div className="-mx-1 h-[56px]">
                        <EnhancedGraph isPositive={pool.isUp} points={12} height={56} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
