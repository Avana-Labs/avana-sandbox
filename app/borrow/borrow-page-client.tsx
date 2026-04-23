"use client"

import { useCallback, useMemo, useState } from "react"
import { Eye, EyeOff, Info } from "lucide-react"
import type { BorrowPool, BorrowProtocolMap } from "@/app/lib/borrow-data"
import {
  LIQUIDATION_LTV,
  MAX_LTV,
  getHealthStatus,
} from "@/app/lib/home-sim"
import { cn } from "@/lib/utils"
import {
  BorrowWorkspace,
  type BorrowDebtsHeroStats,
  type BorrowSupplyHeroStats,
} from "./components/borrow-workspace"
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
  const heroSectionClassName = "mb-4 px-1 md:px-2 min-h-[19rem] md:min-h-[16rem]"

  const metricsData = useMemo(() => {
    const totalCollaterals = allPools.reduce((sum, pool) => sum + Math.max(pool.tvl, 0), 0)
    const totalVolume24h = allPools.reduce((sum, pool) => sum + Math.max(pool.volume24h, 0), 0)
    const weightedPoolApy =
      totalCollaterals > 0 ? allPools.reduce((sum, pool) => sum + pool.apy * Math.max(pool.tvl, 0), 0) / totalCollaterals : 0

    const maxLtv = 0.8
    const utilizationRatio = Math.min(0.85, Math.max(0.5, 0.5 + (weightedPoolApy / 100) * 0.7))
    const usedLtv = maxLtv * utilizationRatio
    const totalLoans = totalCollaterals * usedLtv
    const availableCredit = Math.max(totalCollaterals * maxLtv - totalLoans, 0)
    const totalTvl = totalCollaterals + totalVolume24h * 0.12

    return {
      totalTvl,
      collaterals: totalCollaterals,
      availableCredit,
      totalLoans,
    }
  }, [allPools])

  const historyGraph = useMemo(() => {
    const dayFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
    const endDate = new Date("2026-04-08T12:00:00")
    const weeksCount = 32
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - (weeksCount - 1) * 7)

    const series = Array.from({ length: weeksCount }, (_, index) => {
      const progress = index / Math.max(weeksCount - 1, 1)
      const waveA = Math.sin(index / 4.2)
      const waveB = Math.cos(index / 7.1)
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + index * 7)

      const totalTvl = metricsData.totalTvl * (0.9 + progress * 0.12 + waveA * 0.03)
      const collaterals = metricsData.collaterals * (0.91 + progress * 0.11 + waveB * 0.025)
      const availableCredit = metricsData.availableCredit * (0.95 + progress * 0.04 + waveA * 0.02 - waveB * 0.01)
      const totalLoans = metricsData.totalLoans * (0.89 + progress * 0.1 + waveB * 0.03)

      return {
        date,
        label: dayFormatter.format(date),
        totalTvl,
        collaterals,
        availableCredit,
        totalLoans,
        tvlLevel: Math.min(4, Math.max(0, Math.round((0.35 + progress * 0.45 + waveA * 0.12) * 4))),
        collateralLevel: Math.min(4, Math.max(0, Math.round((0.32 + progress * 0.38 + waveB * 0.14) * 4))),
        creditLevel: Math.min(4, Math.max(0, Math.round((0.28 + progress * 0.24 + waveA * 0.1) * 4))),
        loansLevel: Math.min(4, Math.max(0, Math.round((0.26 + progress * 0.3 + waveB * 0.1) * 4))),
      }
    })

    return {
      series,
      palettes: {
        tvl: ["bg-[#f3f5f8]", "bg-[#e4eaf1]", "bg-[#ced8e4]", "bg-[#aebfd1]", "bg-[#8fa5be]"],
        collateral: ["bg-[#f3faf6]", "bg-[#e3f4ea]", "bg-[#caead8]", "bg-[#a4d8ba]", "bg-[#7ec39f]"],
        credit: ["bg-[#f5f2ff]", "bg-[#ece7ff]", "bg-[#ddd4ff]", "bg-[#c1b4fb]", "bg-[#a092ef]"],
        loans: ["bg-[#faf7f2]", "bg-[#f1e9de]", "bg-[#e7d8c4]", "bg-[#d9bea0]", "bg-[#c29f78]"],
      },
    }
  }, [metricsData])

  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(historyGraph.series.length - 1)
  const selectedHistoryPoint = historyGraph.series[selectedHistoryIndex] ?? historyGraph.series[historyGraph.series.length - 1]

  const [currentTab, setCurrentTab] = useState<BorrowTabId>("pools")
  const [supplyStats, setSupplyStats] = useState<BorrowSupplyHeroStats | null>(null)
  const [debtsStats, setDebtsStats] = useState<BorrowDebtsHeroStats | null>(null)
  const handleTabChange = useCallback((tab: BorrowTabId) => setCurrentTab(tab), [])
  const handleSupplyStatsChange = useCallback((stats: BorrowSupplyHeroStats) => setSupplyStats(stats), [])
  const handleDebtsStatsChange = useCallback((stats: BorrowDebtsHeroStats) => setDebtsStats(stats), [])

  const positionsHeroStats = currentTab === "positions" && supplyStats && debtsStats ? { supplies: supplyStats, debts: debtsStats } : null
  const [showBalance, setShowBalance] = useState(true)
  const mask = "••••••••"

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
                      <button
                        type="button"
                        onClick={() => setShowBalance((prev) => !prev)}
                        aria-label={showBalance ? "Hide balance" : "Show balance"}
                        className="text-muted-foreground transition-colors hover:text-muted-foreground"
                      >
                        {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-1 font-data text-[1.45rem] font-semibold tracking-tight text-foreground md:text-[1.8rem]">
                      {showBalance ? formatUsdWhole(positionsHeroStats.supplies.collateral) : mask}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="m-0 text-[12px] font-medium leading-none tracking-tight text-muted-foreground">Total Borrowed</p>
                    </div>
                    <p className="mt-1 font-data text-[1.45rem] font-semibold tracking-tight text-foreground md:text-[1.8rem]">
                      {showBalance ? formatUsdWhole(positionsHeroStats.debts.totalBorrowed) : mask}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5 md:ml-auto md:text-right">
                  <HeroStat label="Available" value={showBalance ? formatUsdWhole(positionsHeroStats.supplies.available) : mask} dotClass="bg-[#7ec39f]" labelClass="text-[#6ca98b]" />
                  <HeroStat label="Fees Earned" value={showBalance ? formatUsdWhole(positionsHeroStats.supplies.fees) : mask} dotClass="bg-emerald-500" labelClass="text-emerald-600" />
                  <HeroStat
                    label="Accrued Interest"
                    value={showBalance ? formatUsdCents(positionsHeroStats.debts.accruedInterest) : mask}
                    dotClass="bg-rose-400"
                    labelClass="text-rose-500"
                  />
                  <HeroStat
                    label="Daily Interest"
                    value={showBalance ? `+${formatUsdCents(positionsHeroStats.debts.dailyInterest)}` : mask}
                    dotClass="bg-rose-400"
                    labelClass="text-rose-500"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/40 bg-card/50 p-5">
                  <HealthFactorCard hf={positionsHeroStats.debts.averageHf ?? positionsHeroStats.supplies.averageHf} showBalance={showBalance} />
                </div>
                <div className="rounded-lg border border-border/40 bg-card/50 p-5">
                  <CurrentLtvCard
                    borrowed={positionsHeroStats.debts.totalBorrowed}
                    collateral={positionsHeroStats.debts.totalCollateral}
                    showBalance={showBalance}
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
                        {formatUsd(selectedHistoryPoint?.availableCredit ?? metricsData.availableCredit)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[12px] font-medium tracking-tight text-muted-foreground">Total TVL</p>
                      <p className="mt-1 font-data text-[1.45rem] font-semibold tracking-tight text-foreground md:text-[1.8rem]">
                        {formatUsd(selectedHistoryPoint?.totalTvl ?? metricsData.totalTvl)}
                      </p>
                    </>
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
                      {formatUsd(selectedHistoryPoint?.totalTvl ?? metricsData.totalTvl)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6ca98b] md:justify-end">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7ec39f]" />
                      Total Collateral
                    </div>
                    <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                      {formatUsd(selectedHistoryPoint?.collaterals ?? metricsData.collaterals)}
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
                      {formatUsd(selectedHistoryPoint?.collaterals ?? metricsData.collaterals)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#7d72cc] md:justify-end">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#a092ef]" />
                      Available Credit
                    </div>
                    <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                      {formatUsd(selectedHistoryPoint?.availableCredit ?? metricsData.availableCredit)}
                    </p>
                  </div>
                )}

                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#b1835f] md:justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c29f78]" />
                    Outstanding Loans
                  </div>
                  <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                    {formatUsd(selectedHistoryPoint?.totalLoans ?? metricsData.totalLoans)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full">
                <div className="grid gap-2">
                  {[
                    { key: "tvl", levels: historyGraph.series.map((point) => point.tvlLevel) },
                    { key: "collateral", levels: historyGraph.series.map((point) => point.collateralLevel) },
                    { key: "credit", levels: historyGraph.series.map((point) => point.creditLevel) },
                    { key: "loans", levels: historyGraph.series.map((point) => point.loansLevel) },
                  ].map((row) => (
                    <div
                      key={row.key}
                      className="grid gap-1.5"
                      style={{ gridTemplateColumns: `repeat(${historyGraph.series.length}, minmax(0, 1fr))` }}
                    >
                      {row.levels.map((level, index) => {
                        const palette = historyGraph.palettes[row.key as keyof typeof historyGraph.palettes]
                        const isSelected = index === selectedHistoryIndex
                        return (
                          <button
                            key={`${row.key}-${index}`}
                            type="button"
                            title={historyGraph.series[index]?.label}
                            onClick={() => setSelectedHistoryIndex(index)}
                            className={`h-5 min-w-0 rounded-[5px] transition-all duration-150 hover:scale-[1.04] ${
                              palette[level]
                            } ${isSelected ? "ring-1 ring-slate-400/80 ring-offset-2 ring-offset-background" : ""}`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-end text-[12px] font-medium text-muted-foreground md:text-[13px]">
                  <span>{selectedHistoryPoint?.label ?? ""}</span>
                </div>
              </div>
            </div>
          </section>
          )}

        <BorrowWorkspace
          onTabChange={handleTabChange}
          onSupplyStatsChange={handleSupplyStatsChange}
          onDebtsStatsChange={handleDebtsStatsChange}
          showBalance={showBalance}
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
