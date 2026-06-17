"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EnhancedGraph } from "@/app/components/enhanced-graph"
import type { PortfolioStrategyBucket } from "@/app/lib/data/providers/portfolio"

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

export function PortfolioStrategies({ buckets }: { buckets: PortfolioStrategyBucket[] }) {
  return (
    <section className="mb-8 space-y-6">
      <div className="space-y-1">
        <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">Strategy Buckets</h2>
        <p className="text-[12.5px] text-muted-foreground">
          Strategy groupings for portfolio construction across conservative, moderate, and aggressive LP allocations.
        </p>
      </div>

      <div className="grid gap-6">
        {buckets.map((strategy) => (
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
                        <span className="font-data font-medium tabular-nums text-accent-primary">${pool.allocationUsd.toLocaleString()}</span>
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
