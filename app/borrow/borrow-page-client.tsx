"use client"

import Link from "next/link"
import { useMemo } from "react"
import { formatCompactUsd, type BorrowPoolRow } from "@/app/lib/data/borrow-domain"
import type { BorrowPageData, BorrowWorkspaceData } from "@/app/lib/data/providers/borrow"
import { borrowMarketDetailPath } from "@/app/lib/borrow-routes"
import { useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { cn } from "@/lib/utils"
import { TokenPairCell } from "./components/atoms"
import { BorrowWorkspaceShell } from "./borrow-workspace-shell"
import { useBorrowPageLive } from "./use-borrow-page-live"

type BorrowPageClientProps = { pageData: BorrowPageData }

function formatUsd(value: number) {
  return formatCompactUsd(value)
}

/** Borrow markets UI: hero-level metrics (from server-prepared data) + the 4-tab Borrow workspace. */
export function BorrowPageClient({ pageData }: BorrowPageClientProps) {
  const session = useBorrowSessionContext()
  const livePageData = useBorrowPageLive(pageData.walletId, session)
  const resolvedPageData = useMemo(() => livePageData ?? pageData, [livePageData, pageData])
  const heroSectionClassName = "mb-4 px-1 md:px-2"
  const workspaceData: BorrowWorkspaceData = {
    walletId: resolvedPageData.walletId,
    borrowSessionSeed: resolvedPageData.borrowSessionSeed,
    poolCatalog: resolvedPageData.poolCatalog,
    borrowableAssets: resolvedPageData.borrowableAssets,
    pendingRows: resolvedPageData.pendingRows,
    dexes: resolvedPageData.dexes,
    collateralPools: resolvedPageData.collateralPools,
    initialDebts: resolvedPageData.initialDebts,
    borrowSnapshot: resolvedPageData.borrowSnapshot,
  }
  const heroCards = [
    {
      title: "Trending Collateral",
      rows: resolvedPageData.explore.trendingCollateral.map((pool) => ({
        id: `trending-${pool.id}`,
        href: borrowMarketDetailPath(pool.id),
        pool,
        title: pool.name,
        subtitle: `${formatCompactUsd(pool.tvlUsd)} TVL`,
        value: formatCompactUsd(pool.availableUsd),
        delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
        deltaClassName: "text-emerald-500",
      })),
    },
    {
      title: "Top Markets",
      rows: resolvedPageData.explore.topMarkets.map((pool) => ({
        id: `top-${pool.id}`,
        href: borrowMarketDetailPath(pool.id),
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
      rows: resolvedPageData.explore.highApyPools.map((pool) => ({
        id: `apy-${pool.id}`,
        href: borrowMarketDetailPath(pool.id),
        pool,
        title: pool.name,
        subtitle: `${formatCompactUsd(pool.tvlUsd)} TVL`,
        value: formatCompactUsd(pool.tvlUsd),
        delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
        deltaClassName: "text-emerald-500",
      })),
    },
  ]

  const totalTvlChange = resolvedPageData.heroMetrics.totalTvlChangePct
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
                      {formatUsd(resolvedPageData.heroMetrics.totalTvlUsd)}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-data text-[11px] font-medium tabular-nums",
                        totalTvlChangeIsUp ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      <span aria-hidden className="text-[10px] leading-none">
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
                    {formatUsd(resolvedPageData.heroMetrics.totalCollateralUsd)}
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#7d72cc] md:justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#a092ef]" />
                    Available Credit
                  </div>
                  <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                    {formatUsd(resolvedPageData.heroMetrics.availableCreditUsd)}
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#b1835f] md:justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c29f78]" />
                    Outstanding Loans
                  </div>
                  <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                    {formatUsd(resolvedPageData.heroMetrics.outstandingLoansUsd)}
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
          <BorrowWorkspaceShell pageData={workspaceData} />
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
