"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EnhancedGraph } from "@/app/components/enhanced-graph"
import type { PortfolioStrategyBucket } from "@/app/lib/data/providers/portfolio"
import { getLocalAssetIcon } from "@/app/lib/local-asset-icons"

function getPoolLogo(poolName: string) {
  if (poolName.includes("Uniswap")) return getLocalAssetIcon("UNI") ?? "/placeholder.svg"
  if (poolName.includes("Aave")) return getLocalAssetIcon("AAVE") ?? "/placeholder.svg"
  if (poolName.includes("Convex")) return getLocalAssetIcon("Convex Finance") ?? "/placeholder.svg"
  if (poolName.includes("Chainlink")) return getLocalAssetIcon("Chainlink") ?? "/placeholder.svg"
  if (poolName.includes("Compound")) return getLocalAssetIcon("Compound") ?? "/placeholder.svg"
  if (poolName.includes("Rocket Pool")) return getLocalAssetIcon("Rocket Pool") ?? "/placeholder.svg"
  if (poolName.includes("Balancer")) return getLocalAssetIcon("BAL") ?? "/placeholder.svg"
  if (poolName.includes("Solana")) return getLocalAssetIcon("SOL") ?? "/placeholder.svg"
  if (poolName.includes("Curve")) return getLocalAssetIcon("CRV") ?? "/placeholder.svg"
  if (poolName.includes("Pancakeswap")) return getLocalAssetIcon("PancakeSwap") ?? "/placeholder.svg"
  if (poolName.includes("Sushiswap")) return getLocalAssetIcon("Sushiswap") ?? "/placeholder.svg"
  return "/placeholder.svg"
}

const TONE_STYLES: Record<
  PortfolioStrategyBucket["tone"],
  { badgeClassName: string; accentClassName: string }
> = {
  conservative: {
    badgeClassName:
      "rounded-xs border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-blue-700 dark:text-blue-400",
    accentClassName: "from-blue-500/[0.03]",
  },
  moderate: {
    badgeClassName:
      "rounded-xs border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-indigo-700 dark:text-indigo-400",
    accentClassName: "from-indigo-500/[0.03]",
  },
  aggressive: {
    badgeClassName:
      "rounded-xs border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-rose-700 dark:text-rose-400",
    accentClassName: "from-rose-500/[0.03]",
  },
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
            <div className={`absolute inset-0 bg-gradient-to-br ${TONE_STYLES[strategy.tone].accentClassName} via-transparent to-transparent`} />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-medium tracking-tight text-foreground">{strategy.title}</h3>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">{strategy.description}</p>
                </div>
                <Badge variant="secondary" className={TONE_STYLES[strategy.tone].badgeClassName}>
                  {strategy.apyRangeLabel}
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
                        <span className="font-data font-medium tabular-nums text-foreground">{pool.apyPct.toFixed(1)}%</span>
                      </div>

                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-muted-foreground">TVL</span>
                        <span className="font-data tabular-nums text-foreground">${pool.tvlUsd.toLocaleString()}</span>
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
