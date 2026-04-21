"use client"

import { useMemo, useState } from "react"
import type { BorrowPool, BorrowProtocolMap } from "@/app/lib/borrow-data"
import { BorrowWorkspace } from "./components/borrow-workspace"

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

/** Borrow markets UI: hero-level metrics (from server-prepared data) + the 4-tab Borrow workspace. */
export function BorrowPageClient({ allPools }: BorrowPageClientProps) {
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

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <section className="mb-10 px-1 md:px-2">
            <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium tracking-tight text-slate-500">Total TVL</p>
                  <p className="mt-1 font-data text-[1.45rem] font-semibold tracking-tight text-slate-900 md:text-[1.8rem]">
                    {formatUsd(selectedHistoryPoint?.totalTvl ?? metricsData.totalTvl)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5 md:ml-auto md:text-right">
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6ca98b] md:justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7ec39f]" />
                    Total Collateral
                  </div>
                  <p className="font-data text-[1rem] font-semibold tracking-tight text-slate-900">
                    {formatUsd(selectedHistoryPoint?.collaterals ?? metricsData.collaterals)}
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#7d72cc] md:justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#a092ef]" />
                    Available Credit
                  </div>
                  <p className="font-data text-[1rem] font-semibold tracking-tight text-slate-900">
                    {formatUsd(selectedHistoryPoint?.availableCredit ?? metricsData.availableCredit)}
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#b1835f] md:justify-end">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c29f78]" />
                    Outstanding Loans
                  </div>
                  <p className="font-data text-[1rem] font-semibold tracking-tight text-slate-900">
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

                <div className="mt-4 flex items-center justify-end text-[12px] font-medium text-slate-500 md:text-[13px]">
                  <span>{selectedHistoryPoint?.label ?? ""}</span>
                </div>
              </div>
            </div>
          </section>

          <BorrowWorkspace />
        </div>
      </main>
    </div>
  )
}
