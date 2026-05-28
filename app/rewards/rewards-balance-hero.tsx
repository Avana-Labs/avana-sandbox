"use client"

import Image from "next/image"
import { Info } from "lucide-react"
import { HeroMarketCard } from "@/app/borrow/borrow-page-client"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { BORROW_POOL_CATALOG, formatCompactUsd } from "@/app/lib/borrow-sim"

const REWARDS_BALANCE_TOTAL = 14_400

type RewardsBalanceHeroProps = {
  completedPools: number
  totalPools: number
  progressPercentage: number
}

function formatTokenAmount(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  })
}

export function RewardsBalanceHero({ completedPools, totalPools, progressPercentage }: RewardsBalanceHeroProps) {
  const { showDollarAmounts } = useDisplayPreferences()
  const rewardsPools = BORROW_POOL_CATALOG
    .filter((pool) => pool.visuals.every((visual) => Boolean(visual.iconUrl)))
    .sort((left, right) => right.tvlUsd - left.tvlUsd)
    .slice(0, 2)
    .map((pool) => ({
      id: `rewards-${pool.protocol}-${pool.name}`,
      href: `/borrow/pool/${pool.id}`,
      pool,
      title: pool.name,
      subtitle: `${pool.feeTier} fee · ${formatCompactUsd(pool.tvlUsd)} TVL`,
      value: formatCompactUsd(pool.tvlUsd),
      delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
      deltaClassName: "text-emerald-500",
    }))

  return (
    <div className="mb-8 grid gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] xl:items-start">
      <section className="relative overflow-hidden rounded-radius-md border border-border/70 bg-card px-5 py-3 md:h-[174px]">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1.2px)] [background-position:18px_18px] [background-size:16px_16px] dark:opacity-35 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1.2px)]" />
        <div className="pointer-events-none absolute inset-y-0 -right-12 flex items-center md:-right-20">
          <Image
            src="/Avana Icon (Personal) PNG.png"
            alt=""
            width={760}
            height={760}
            className="h-64 w-64 object-contain opacity-[0.08] brightness-0 dark:invert dark:opacity-[0.06] md:h-[20rem] md:w-[20rem] md:opacity-[0.09] md:dark:opacity-[0.07]"
            aria-hidden
          />
        </div>

        <div className="relative flex min-h-[120px] flex-col gap-2 md:h-full md:min-h-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[28px]">
                  {showDollarAmounts ? formatTokenAmount(REWARDS_BALANCE_TOTAL) : "••••••••"}
                  <span className="ml-1.5 align-middle text-[0.9em]">AVA</span>
                </span>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#01AACF] ring-1 ring-[#01AACF]/20">
                  <Image
                    src="/Avana Icon (Personal) PNG.png"
                    alt="Avana token"
                    width={38}
                    height={38}
                    className="h-[38px] w-[38px] scale-[1.68] object-contain brightness-0 invert"
                    priority
                  />
                </div>
              </div>

              <div className="mt-0.5 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                <span>Rewards earned</span>
                <Info className="h-3.5 w-3.5" />
              </div>
            </div>

            <Button variant="outline" className="h-9 shrink-0 rounded-[14px] px-4 text-[12px] font-medium shadow-none">
              Collect rewards
            </Button>
          </div>

          <div className="relative mt-auto space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium text-muted-foreground">Your progress</span>
              <span className="text-[12px] font-medium text-muted-foreground">
                {completedPools}/{totalPools} completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" aria-label="Overall quest completion progress" />
          </div>
        </div>
      </section>

      <section className="hidden min-w-0 md:block">
        <HeroMarketCard title="Rewards Pools" hideHeader rows={rewardsPools} />
      </section>
    </div>
  )
}
