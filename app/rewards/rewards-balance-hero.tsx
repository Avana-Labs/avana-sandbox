"use client"

import Image from "next/image"
import Link from "next/link"
import { Info } from "lucide-react"
import { HeroMarketCard } from "@/app/borrow/borrow-hero-market-card"
import { Progress } from "@/components/ui/progress"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import type { RewardsHeroPoolRow } from "@/app/lib/data/providers/rewards"
import { cn } from "@/lib/utils"

function formatTokenAmount(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  })
}

function formatClaimAmount(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })
}

export function RewardsBalanceHero({
  rewardPools,
  balanceTotal,
  claimableAmount,
  claimableCount,
  completedCount,
  totalCount,
  progressPercentage,
  claimHref,
}: {
  rewardPools: RewardsHeroPoolRow[]
  balanceTotal: number
  claimableAmount: number
  claimableCount: number
  completedCount: number
  totalCount: number
  progressPercentage: number
  claimHref?: string
}) {
  const { showDollarAmounts } = useDisplayPreferences()
  const claimLabel =
    claimableCount > 0 ? `Claim ${formatClaimAmount(claimableAmount)} AVA` : "No rewards ready"
  const claimButtonClass = cn(
    "inline-flex h-10 w-full items-center justify-center rounded-[11px] px-4 text-[12px] font-medium transition-colors sm:h-9 sm:w-auto",
    claimableCount > 0
      ? "bg-[#9CDD4C] text-[#163300] hover:bg-[#8fd341]"
      : "cursor-not-allowed bg-muted/60 text-muted-foreground",
  )

  return (
    <div className="mb-6 grid gap-5 md:mb-8 md:gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] xl:items-start">
      <section className="relative overflow-hidden rounded-radius-md border border-border/70 bg-card px-4 py-4 sm:px-5 md:min-h-[174px]">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1.2px)] [background-position:18px_18px] [background-size:16px_16px] dark:opacity-35 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1.2px)]" />
        <div className="pointer-events-none absolute inset-y-0 -right-12 flex items-center md:-right-20">
          <Image
            src="/avana-icon.svg"
            alt=""
            width={760}
            height={760}
            className="h-48 w-48 object-contain opacity-[0.08] brightness-0 dark:invert dark:opacity-[0.06] sm:h-64 sm:w-64 md:h-[20rem] md:w-[20rem] md:opacity-[0.09] md:dark:opacity-[0.07]"
            aria-hidden
          />
        </div>

        <div className="relative flex flex-col gap-4 md:min-h-[142px] md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[24px] font-normal leading-none tracking-[-0.03em] text-foreground sm:text-[28px] md:text-[30px]">
                  {showDollarAmounts ? formatTokenAmount(balanceTotal) : "••••••••"}
                  <span className="ml-1.5 align-middle text-[0.78em]">AVA</span>
                </span>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#01AACF] ring-1 ring-[#01AACF]/20">
                  <Image
                    src="/avana-icon.svg"
                    alt="Avana token"
                    width={38}
                    height={38}
                    className="h-[38px] w-[38px] scale-[1.68] object-contain brightness-0 invert"
                    priority
                  />
                </div>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-normal tracking-[0.14em] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  AVA balance
                  <Info className="h-3 w-3" />
                </span>
                {claimableAmount > 0 ? (
                  <span className="text-foreground/80">
                    +{formatClaimAmount(claimableAmount)} AVA ready to claim
                  </span>
                ) : null}
              </div>
            </div>

            {claimableCount > 0 && claimHref ? (
              <Link href={claimHref} className={claimButtonClass} data-testid="rewards-claim-all">
                {claimLabel}
              </Link>
            ) : (
              <button type="button" disabled className={claimButtonClass} data-testid="rewards-claim-all">
                {claimLabel}
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                Your progress
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {completedCount}/{totalCount} completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" aria-label="Overall quest completion progress" />
          </div>
        </div>
      </section>

      <section className="hidden min-w-0 md:block">
        <HeroMarketCard title="Rewards Pools" rows={rewardPools} />
      </section>
    </div>
  )
}
