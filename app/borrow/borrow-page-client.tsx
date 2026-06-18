"use client"

import { useMemo } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { formatCompactUsd, type BorrowPoolRow } from "@/app/lib/data/borrow-domain"
import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import { cn } from "@/lib/utils"
import { TokenPairCell } from "./components/atoms"

const BorrowWorkspace = dynamic(() => import("./components/borrow-workspace").then((mod) => mod.BorrowWorkspace), {
  loading: () => <div className="h-[960px] rounded-radius-md border border-border bg-surface-raised/60" />,
})

type BorrowPageClientProps = { pageData: BorrowPageData }

function formatUsd(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${Math.round(value)}`
}

/** Borrow markets UI: hero-level metrics (from server-prepared data) + the 4-tab Borrow workspace. */
export function BorrowPageClient({ pageData }: BorrowPageClientProps) {
  const heroSectionClassName = "mb-4 px-1 md:px-2"
  const { allPools, poolCatalog } = pageData

  const metricsData = useMemo(() => {
    const totalCollaterals = allPools.reduce((sum, pool) => sum + Math.max(pool.tvl, 0), 0)
    const totalVolume24h = allPools.reduce((sum, pool) => sum + Math.max(pool.volume24h, 0), 0)
    const totalTvlChangeWeighted = allPools.reduce((sum, pool) => sum + pool.change * Math.max(pool.tvl, 0), 0)
    const weightedPoolApy =
      totalCollaterals > 0 ? allPools.reduce((sum, pool) => sum + pool.apy * Math.max(pool.tvl, 0), 0) / totalCollaterals : 0

    const maxLtv = 0.8
    const utilizationRatio = Math.min(0.85, Math.max(0.5, 0.5 + (weightedPoolApy / 100) * 0.7))
    const usedLtv = maxLtv * utilizationRatio
    const totalLoans = totalCollaterals * usedLtv
    const availableCredit = Math.max(totalCollaterals * maxLtv - totalLoans, 0)
    const totalTvl = totalCollaterals + totalVolume24h * 0.12
    const totalTvlChange = totalCollaterals > 0 ? totalTvlChangeWeighted / totalCollaterals : 0

    return {
      totalTvl,
      collaterals: totalCollaterals,
      availableCredit,
      totalLoans,
      totalTvlChange,
    }
  }, [allPools])

  const heroCards = useMemo(() => {
    const poolsWithLogos = poolCatalog.filter((pool) => pool.visuals.every((visual) => Boolean(visual.iconUrl)))

    const sortByMetric = (metric: "tvlUsd" | "availableUsd" | "apy") =>
      [...poolsWithLogos]
        .sort((left, right) => {
          const leftValue =
            metric === "tvlUsd" ? left.tvlUsd : metric === "availableUsd" ? left.availableUsd : (left.aprMin + left.aprMax) / 2
          const rightValue =
            metric === "tvlUsd" ? right.tvlUsd : metric === "availableUsd" ? right.availableUsd : (right.aprMin + right.aprMax) / 2
          return rightValue - leftValue
        })
        .slice(0, 3)

    return [
      {
        title: "Trending Collateral",
        rows: sortByMetric("availableUsd").map((pool) => ({
          id: `trending-${pool.id}`,
          href: `/borrow/pool/${pool.id}`,
          pool,
          title: pool.name,
          subtitle: `${formatCompactUsd(pool.tvlUsd)} TVL`,
          value: formatCompactUsd(pool.availableUsd),
          delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
          deltaClassName: "text-emerald-500",
        })),
      },
      {
        title: "Rewards Pools",
        rows: sortByMetric("tvlUsd").map((pool) => ({
          id: `rewards-${pool.id}`,
          href: `/borrow/pool/${pool.id}`,
          pool,
          title: pool.name,
          subtitle: `${formatCompactUsd(pool.tvlUsd)} TVL`,
          value: formatCompactUsd(pool.tvlUsd),
          delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
          deltaClassName: "text-emerald-500",
        })),
      },
      {
        title: "High APY Pools",
        rows: [...poolsWithLogos]
          .sort((left, right) => (right.aprMin + right.aprMax) / 2 - (left.aprMin + left.aprMax) / 2)
          .slice(0, 3)
          .map((pool) => ({
            id: `apy-${pool.id}`,
            href: `/borrow/pool/${pool.id}`,
            pool,
            title: pool.name,
            subtitle: `${formatCompactUsd(pool.tvlUsd)} TVL`,
            value: formatCompactUsd(pool.tvlUsd),
            delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
            deltaClassName: "text-emerald-500",
          })),
      },
    ]
  }, [poolCatalog])

  const totalTvlChange = metricsData.totalTvlChange
  const totalTvlChangeIsUp = totalTvlChange >= 0
  const totalTvlChangeLabel = `${totalTvlChangeIsUp ? "+" : ""}${totalTvlChange.toFixed(2)}%`

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
          <section className={heroSectionClassName}>
            <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-[12px] font-medium tracking-tight text-muted-foreground">Total TVL</p>
                    <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
                      {formatUsd(metricsData.totalTvl)}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-data text-[11px] font-medium tabular-nums",
                        totalTvlChangeIsUp ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      <span aria-hidden className="text-[9px] leading-none">
                        {totalTvlChangeIsUp ? "▲" : "▼"}
                      </span>
                      {totalTvlChangeLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5 md:ml-auto md:text-right">
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6ca98b] md:justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7ec39f]" />
                    Total Collateral
                  </div>
                  <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                    {formatUsd(metricsData.collaterals)}
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#7d72cc] md:justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#a092ef]" />
                    Available Credit
                  </div>
                  <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                    {formatUsd(metricsData.availableCredit)}
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#b1835f] md:justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c29f78]" />
                    Outstanding Loans
                  </div>
                  <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                    {formatUsd(metricsData.totalLoans)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">
                    Explore
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="flex min-w-max gap-3">
                  {heroCards.map((card) => (
                    <HeroMarketCard key={card.title} title={card.title} rows={card.rows} />
                  ))}
                </div>
              </div>
            </div>

          </section>

        <BorrowWorkspace pageData={pageData} />
        </div>
      </main>
    </div>
  )
}

export type HeroMarketCardProps = {
  title: string
  subtitle?: string
  hideTitleOnMobile?: boolean
  className?: string
  rows: Array<{
    id: string
    href: string
    pool: BorrowPoolRow
    title: string
    subtitle: string
    value: string
    delta: string
    deltaClassName: string
  }>
}

export function HeroMarketCard({ title, subtitle, hideTitleOnMobile = false, className, rows }: HeroMarketCardProps) {
  return (
    <section
      className={cn(
        "min-w-[19rem] max-w-[19rem] shrink-0 rounded-radius-md border border-border/70 bg-background p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] md:min-w-[20rem] md:max-w-[20rem] md:p-4",
        className,
      )}
    >
      <div className="mb-3">
        <h3
          className={cn(
            "font-compact text-[14px] font-medium tracking-tight text-foreground md:text-[15px]",
            hideTitleOnMobile ? "hidden md:block" : "",
          )}
        >
          {title}
        </h3>
        {subtitle ? <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">{subtitle}</p> : null}
      </div>

      <div className="space-y-3.5">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className="flex items-center gap-3 rounded-xs px-1 py-1 transition-colors hover:bg-surface-inset"
          >
            <div className="min-w-0 flex-1">
              <TokenPairCell visuals={row.pool.visuals} name={row.title} subtitle={row.subtitle} size="sm" />
            </div>

            <div className="ml-auto flex min-w-0 shrink-0 flex-col items-end gap-1 text-right">
              <div className="font-data text-[13px] font-medium tabular-nums leading-tight tracking-tight text-foreground md:text-[14px]">
                {row.value}
              </div>
              <div className={cn("font-data text-[11px] font-medium tabular-nums leading-tight md:text-[12px]", row.deltaClassName)}>
                {row.delta}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
