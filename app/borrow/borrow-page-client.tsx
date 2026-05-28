"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { Info } from "lucide-react"
import type { BorrowPool, BorrowProtocolMap } from "@/app/lib/borrow-data"
import { BORROW_POOL_CATALOG, formatCompactUsd, type BorrowPoolRow } from "@/app/lib/borrow-sim"
import {
  LIQUIDATION_LTV,
  MAX_LTV,
  getHealthStatus,
} from "@/app/lib/home-sim"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { cn } from "@/lib/utils"
import {
  BorrowWorkspace,
  type BorrowDebtsHeroStats,
  type BorrowSupplyHeroStats,
} from "./components/borrow-workspace"
import { TokenPairCell } from "./components/atoms"
import type { BorrowTabId } from "./components/tabs-bar"

type BorrowPageClientProps = {
  protocols: BorrowProtocolMap
  allPools: BorrowPool[]
  protocolLogos: Record<string, string>
  itemsPerPage: number
}

function formatUsd(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${Math.round(value)}`
}

function formatUsdWhole(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`
}

function formatUsdCents(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Borrow markets UI: hero-level metrics (from server-prepared data) + the 4-tab Borrow workspace. */
export function BorrowPageClient({ allPools }: BorrowPageClientProps) {
  const heroSectionClassName = "mb-4 px-1 md:px-2"

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
    const poolsWithLogos = BORROW_POOL_CATALOG.filter((pool) => pool.visuals.every((visual) => Boolean(visual.iconUrl)))

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
          id: `trending-${pool.protocol}-${pool.name}`,
          href: `/borrow/pool/${pool.id}`,
          pool,
          title: pool.name,
          subtitle: `${pool.feeTier} fee · ${formatCompactUsd(pool.tvlUsd)} TVL`,
          value: formatCompactUsd(pool.availableUsd),
          delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
          deltaClassName: "text-emerald-500",
        })),
      },
      {
        title: "Rewards Pools",
        rows: sortByMetric("tvlUsd").map((pool) => ({
          id: `rewards-${pool.protocol}-${pool.name}`,
          href: `/borrow/pool/${pool.id}`,
          pool,
          title: pool.name,
          subtitle: `${pool.feeTier} fee · ${formatCompactUsd(pool.tvlUsd)} TVL`,
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
            id: `apy-${pool.protocol}-${pool.name}`,
            href: `/borrow/pool/${pool.id}`,
            pool,
            title: pool.name,
            subtitle: `${pool.feeTier} fee · ${formatCompactUsd(pool.tvlUsd)} TVL`,
            value: formatCompactUsd(pool.tvlUsd),
            delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
            deltaClassName: "text-emerald-500",
          })),
      },
    ]
  }, [])

  const [currentTab, setCurrentTab] = useState<BorrowTabId>("all-markets")
  const [supplyStats, setSupplyStats] = useState<BorrowSupplyHeroStats | null>(null)
  const [debtsStats, setDebtsStats] = useState<BorrowDebtsHeroStats | null>(null)
  const handleTabChange = useCallback((tab: BorrowTabId) => setCurrentTab(tab), [])
  const handleSupplyStatsChange = useCallback((stats: BorrowSupplyHeroStats) => setSupplyStats(stats), [])
  const handleDebtsStatsChange = useCallback((stats: BorrowDebtsHeroStats) => setDebtsStats(stats), [])

  const positionsHeroStats = currentTab === "positions" && supplyStats && debtsStats ? { supplies: supplyStats, debts: debtsStats } : null
  const { showDollarAmounts } = useDisplayPreferences()
  const mask = "••••••••"
  const totalTvlChange = metricsData.totalTvlChange
  const totalTvlChangeIsUp = totalTvlChange >= 0
  const totalTvlChangeLabel = `${totalTvlChangeIsUp ? "+" : ""}${totalTvlChange.toFixed(2)}%`

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
        {positionsHeroStats ? (
            <section className={heroSectionClassName}>
              <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-1 items-end gap-8 md:gap-12">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="m-0 text-[12px] font-medium leading-none tracking-tight text-muted-foreground">Total Collateral</p>
                    </div>
                    <p className="mt-1 font-data text-[1.45rem] font-semibold tracking-tight text-foreground md:text-[1.8rem]">
                      {showDollarAmounts ? formatUsdWhole(positionsHeroStats.supplies.collateral) : mask}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="m-0 text-[12px] font-medium leading-none tracking-tight text-muted-foreground">Total Borrowed</p>
                    </div>
                    <p className="mt-1 font-data text-[1.45rem] font-semibold tracking-tight text-foreground md:text-[1.8rem]">
                      {showDollarAmounts ? formatUsdWhole(positionsHeroStats.debts.totalBorrowed) : mask}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5 md:ml-auto md:text-right">
                  <HeroStat label="Available" value={showDollarAmounts ? formatUsdWhole(positionsHeroStats.supplies.available) : mask} dotClass="bg-[#7ec39f]" labelClass="text-[#6ca98b]" />
                  <HeroStat label="Fees Earned" value={showDollarAmounts ? formatUsdWhole(positionsHeroStats.supplies.fees) : mask} dotClass="bg-emerald-500" labelClass="text-emerald-600" />
                  <HeroStat
                    label="Accrued Interest"
                    value={showDollarAmounts ? formatUsdCents(positionsHeroStats.debts.accruedInterest) : mask}
                    dotClass="bg-rose-400"
                    labelClass="text-rose-500"
                  />
                  <HeroStat
                    label="Daily Interest"
                    value={showDollarAmounts ? `+${formatUsdCents(positionsHeroStats.debts.dailyInterest)}` : mask}
                    dotClass="bg-rose-400"
                    labelClass="text-rose-500"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/40 bg-card/50 p-5">
                  <HealthFactorCard hf={positionsHeroStats.debts.averageHf ?? positionsHeroStats.supplies.averageHf} showBalance={showDollarAmounts} />
                </div>
                <div className="rounded-lg border border-border/40 bg-card/50 p-5">
                  <CurrentLtvCard
                    borrowed={positionsHeroStats.debts.totalBorrowed}
                    collateral={positionsHeroStats.debts.totalCollateral}
                    showBalance={showDollarAmounts}
                  />
                </div>
              </div>
            </section>
          ) : (
          <section className={heroSectionClassName}>
            <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="min-w-0">
                  {currentTab === "assets" ? (
                    <>
                      <p className="text-[12px] font-medium tracking-tight text-[#7d72cc]">Available Credit</p>
                      <p className="mt-1 font-data text-[1.45rem] font-semibold tracking-tight text-foreground md:text-[1.8rem]">
                        {formatUsd(metricsData.availableCredit)}
                      </p>
                    </>
                  ) : (
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
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5 md:ml-auto md:text-right">
                {currentTab === "assets" ? (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground md:justify-end">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Total TVL
                    </div>
                    <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                      {formatUsd(metricsData.totalTvl)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6ca98b] md:justify-end">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7ec39f]" />
                      Total Collateral
                    </div>
                    <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                      {formatUsd(metricsData.collaterals)}
                    </p>
                  </div>
                )}

                {currentTab === "assets" ? (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6ca98b] md:justify-end">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7ec39f]" />
                      Total Collateral
                    </div>
                    <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                      {formatUsd(metricsData.collaterals)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#7d72cc] md:justify-end">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#a092ef]" />
                      Available Credit
                    </div>
                    <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                      {formatUsd(metricsData.availableCredit)}
                    </p>
                  </div>
                )}

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
                  <h2 className="mt-1 text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">
                    Top pools trending today
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="flex min-w-max gap-3">
                  {heroCards.map((card) => (
                    <HeroMarketCard key={card.title} title={card.title} subtitle={card.subtitle} rows={card.rows} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 mb-3">
              <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">
                Explore more pools collateral
              </h2>
            </div>
          </section>
          )}

        <BorrowWorkspace
          onTabChange={handleTabChange}
          onSupplyStatsChange={handleSupplyStatsChange}
          onDebtsStatsChange={handleDebtsStatsChange}
          showBalance={showDollarAmounts}
        />
        </div>
      </main>
    </div>
  )
}

function HeroStat({
  label,
  value,
  dotClass,
  labelClass,
}: {
  label: string
  value: string
  dotClass: string
  labelClass: string
}) {
  return (
    <div>
      <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-medium md:justify-end ${labelClass}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {label}
      </div>
      <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  )
}

const TICK_COUNT = 28

const HF_ZONES = [
  { id: "danger", label: "Liquidation", min: 0, max: 1.5, widthPct: 30, color: "bg-rose-500" },
  { id: "warn", label: "Caution", min: 1.5, max: 3, widthPct: 40, color: "bg-amber-500" },
  { id: "safe", label: "Safe", min: 3, max: Infinity, widthPct: 30, color: "bg-emerald-500" },
] as const

function HealthFactorCard({ hf, showBalance }: { hf: number | null; showBalance: boolean }) {
  const safeHf = hf ?? Number.POSITIVE_INFINITY
  const status = getHealthStatus(safeHf)
  const hfLabel = hf === null ? "—" : !Number.isFinite(hf) ? "∞" : hf.toFixed(2)
  const masked = !showBalance

  const activeZoneIdx = (() => {
    if (hf === null) return -1
    if (!Number.isFinite(hf)) return HF_ZONES.length - 1
    return HF_ZONES.findIndex((z) => hf >= z.min && hf < z.max)
  })()

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-foreground">Health factor</span>
          <Info className="h-3.5 w-3.5 self-center text-muted-foreground" aria-hidden />
          <span className="font-data text-[20px] font-bold leading-none tracking-tight text-foreground">
            {masked ? "••" : hfLabel}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold tracking-wide",
            status.textClass,
          )}
        >
          <span className={cn("inline-block size-1.5 rounded-full", status.dotClass)} />
          {masked ? "••" : status.label}
        </span>
      </div>

      <div className="flex h-2.5 w-full items-stretch gap-1">
        {HF_ZONES.map((zone, i) => {
          const isActive = i === activeZoneIdx
          return (
            <div
              key={zone.id}
              className={cn("rounded-full transition-colors", isActive ? zone.color : "bg-muted")}
              style={{ width: `${zone.widthPct}%` }}
            />
          )
        })}
      </div>

      <div className="flex h-4 items-center justify-between text-[11px] font-medium text-muted-foreground">
        {HF_ZONES.map((zone, i) => {
          const isActive = i === activeZoneIdx
          return (
            <span key={zone.id} className={cn("inline-flex items-center gap-1.5", isActive && "text-foreground")}>
              <span className={cn("size-1.5 rounded-full", isActive ? zone.color : "bg-muted-foreground/40")} />
              {zone.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function CurrentLtvCard({
  borrowed,
  collateral,
  showBalance,
}: {
  borrowed: number
  collateral: number
  showBalance: boolean
}) {
  const ltv = collateral > 0 ? Math.min(1, borrowed / collateral) : 0
  const ltvPct = ltv * 100
  const liquidationPct = LIQUIDATION_LTV * 100
  const ltvLabel = `${ltvPct.toFixed(2)}%`
  const masked = !showBalance
  const maxUsd = collateral * MAX_LTV
  const usedLabel = masked ? "••" : `$${Math.round(borrowed).toLocaleString("en-US")}`
  const maxLabel = masked ? "••" : `$${Math.round(maxUsd).toLocaleString("en-US")}`

  const usedTicks = Math.max(1, Math.round((ltvPct / 100) * TICK_COUNT))

  const tone =
    ltv >= MAX_LTV * 0.9 ? "bg-rose-500" : ltv >= MAX_LTV * 0.6 ? "bg-amber-500" : "bg-emerald-500"

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-foreground">Current LTV</span>
          <Info className="h-3.5 w-3.5 self-center text-muted-foreground" aria-hidden />
          <span className="font-data text-[20px] font-bold leading-none tracking-tight text-foreground">
            {masked ? "••" : ltvLabel}
          </span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">borrow power used</span>
      </div>

      <div className="flex h-2.5 w-full items-stretch gap-[2px]">
        {Array.from({ length: TICK_COUNT }).map((_, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-[2px] transition-colors", i < usedTicks ? tone : "bg-muted")}
          />
        ))}
      </div>

      <div className="flex h-4 items-center justify-between text-[11px] font-medium text-muted-foreground">
        <span>
          Used <span className="font-semibold text-foreground">{usedLabel}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span>
            Max <span className="font-semibold text-foreground">{maxLabel}</span>
          </span>
          <span className="text-rose-500">{liquidationPct.toFixed(0)}% liq</span>
        </span>
      </div>
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
