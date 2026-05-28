"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Info } from "lucide-react"
import { HeroMarketCard } from "@/app/borrow/borrow-page-client"
import { Button } from "@/components/ui/button"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { BORROW_POOL_CATALOG, formatCompactUsd } from "@/app/lib/borrow-sim"

const REWARDS_BALANCE_TOTAL = 14_400
const REWARDS_GAIN_TOKEN = 12.46
const REWARDS_GAIN_PCT = 4.52

function formatTokenAmount(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  })
}

export function RewardsBalanceHero() {
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
      <section className="relative overflow-hidden rounded-radius-md border border-border/70 bg-card px-5 py-3.5">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1.2px)] [background-position:18px_18px] [background-size:16px_16px] dark:opacity-35 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1.2px)]" />

        <div className="relative flex min-h-[136px] flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-data text-[26px] font-medium leading-none tracking-[-0.04em] text-foreground sm:text-[34px]">
                  {showDollarAmounts ? formatTokenAmount(REWARDS_BALANCE_TOTAL) : "••••••••"}
                  <span className="ml-2 align-middle text-[0.82em]">AVA</span>
                </span>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-100">
                  <Image
                    src="/Avana Icon (Personal) PNG.png"
                    alt="Avana token"
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-full object-cover"
                    priority
                  />
                </div>
              </div>

              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span>Rewards earned</span>
                <Info className="h-3.5 w-3.5" />
              </div>
              <div className="mt-0.5 font-data text-[11px] font-semibold tabular-nums text-pink-500 dark:text-pink-400">
                {showDollarAmounts ? `+${REWARDS_GAIN_TOKEN.toFixed(2)} AVA (${REWARDS_GAIN_PCT.toFixed(2)}%)` : "••••••••"}
              </div>
            </div>

            <Button variant="outline" className="h-10 shrink-0 rounded-[14px] px-4 text-[12px] font-semibold shadow-none">
              Collect rewards
            </Button>
          </div>

          <div className="relative">
            <Button
              asChild
              variant="ghost"
              className="h-auto justify-start gap-2 p-0 text-left text-[14px] font-semibold tracking-[-0.02em] text-foreground hover:bg-transparent hover:text-foreground/80"
            >
              <Link href="#rewards-tabs" aria-label="Find pools with Avana rewards">
                <span>Find pools with Avana rewards</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-1 max-w-[460px] text-[12px] leading-4.5 text-muted-foreground">
              Eligible pools have token rewards so you can earn more.
            </p>
          </div>
        </div>
      </section>

      <section className="hidden min-w-0 md:block">
        <HeroMarketCard title="Rewards Pools" hideHeader rows={rewardsPools} />
      </section>
    </div>
  )
}
