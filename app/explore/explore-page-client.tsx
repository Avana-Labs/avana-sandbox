"use client"

import { memo, useCallback, useDeferredValue, useMemo, useState } from "react"
import Image from "next/image"
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { EnhancedGraph } from "../components/enhanced-graph"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ExplorePool, ExploreProtocolMap } from "@/app/lib/explore-data"

type ExplorePageClientProps = {
  protocols: ExploreProtocolMap
  allPools: ExplorePool[]
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

const PoolCard = memo(function PoolCard({
  pool,
  activeProtocol,
  protocolLogos,
}: {
  pool: ExplorePool
  activeProtocol: string
  protocolLogos: Record<string, string>
}) {
  const protocolLabel = activeProtocol === "All Pools" ? pool.protocol : activeProtocol
  const logo = protocolLogos[protocolLabel] || "/placeholder.svg"

  return (
    <div className="min-w-[200px]">
      <Card className="overflow-hidden border-border/60 bg-card transition-transform duration-200 hover:-translate-y-0.5 hover:border-border">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative h-5 w-5 overflow-hidden rounded-full bg-muted">
                <Image
                  src={logo}
                  alt={protocolLabel}
                  width={20}
                  height={20}
                  sizes="20px"
                  className="rounded-full object-contain"
                  onError={(event) => {
                    const target = event.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=20&width=20"
                  }}
                />
              </div>
              <span className="font-compact text-xs font-medium text-muted-foreground">{protocolLabel}</span>
            </div>
            <div className={`font-data flex items-center gap-1 text-xs font-medium ${pool.isUp ? "text-emerald-600" : "text-rose-600"}`}>
              {pool.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {pool.change.toFixed(1)}%
            </div>
          </div>

          <h3 className="mb-3 text-sm font-medium text-foreground">{pool.name}</h3>

          <div className="relative mb-3">
            <div className="font-data mb-1 text-2xl font-bold text-foreground">{pool.apy.toFixed(1)}%</div>
            <div className="h-[32px] -mx-1">
              <EnhancedGraph
                isPositive={pool.isUp}
                points={12}
                height={32}
                className="origin-bottom scale-110"
                seed={`explore-${protocolLabel}-${pool.name}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground">TVL</span>
              <div className="font-data font-medium text-foreground">${(pool.tvl / 1000000).toFixed(1)}M</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">24h Vol</span>
              <div className="font-data font-medium text-foreground">${(pool.volume24h / 1000000).toFixed(1)}M</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex gap-2">
        {Array.from({ length: totalPages }, (_, index) => (
          <Button
            key={index + 1}
            variant={currentPage === index + 1 ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(index + 1)}
          >
            {index + 1}
          </Button>
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
})

/** Interactive borrow explorer with server-prepared data so the client only handles filtering and pagination. */
export function ExplorePageClient({ protocols, allPools, protocolLogos, itemsPerPage }: ExplorePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeProtocol, setActiveProtocol] = useState("All Pools")
  const [currentPage, setCurrentPage] = useState(1)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const sortBy = "apy"
  const protocolNames = useMemo(() => Object.keys(protocols), [protocols])

  const metricsPools = useMemo(
    () =>
      activeProtocol === "All Pools"
        ? allPools
        : protocols[activeProtocol].map((pool) => ({
            ...pool,
            protocol: activeProtocol,
          })),
    [activeProtocol, allPools, protocols],
  )

  const metricsData = useMemo(() => {
    const totalCollaterals = metricsPools.reduce((sum, pool) => sum + Math.max(pool.tvl, 0), 0)
    const totalVolume24h = metricsPools.reduce((sum, pool) => sum + Math.max(pool.volume24h, 0), 0)
    const weightedPoolApy =
      totalCollaterals > 0
        ? metricsPools.reduce((sum, pool) => sum + pool.apy * Math.max(pool.tvl, 0), 0) / totalCollaterals
        : 0

    const maxLtv = 0.8
    const utilizationRatio = Math.min(0.85, Math.max(0.5, 0.5 + (weightedPoolApy / 100) * 0.7))
    const usedLtv = maxLtv * utilizationRatio
    const totalLoans = totalCollaterals * usedLtv
    const availableCredit = Math.max(totalCollaterals * maxLtv - totalLoans, 0)
    const totalTvl = totalCollaterals + totalVolume24h * 0.12
    const estimatedTradingFeesWindow = totalVolume24h * 0.003
    const apyPaidOnLoans = Math.max(2, weightedPoolApy * 0.45)

    return {
      totalTvl,
      collaterals: totalCollaterals,
      feesEarned: estimatedTradingFeesWindow,
      availableCredit,
      utilizationLabel: `${(usedLtv * 100).toFixed(1)}% of ${(maxLtv * 100).toFixed(0)}% max LTV used`,
      totalLoans,
      loansApyLabel: `${apyPaidOnLoans.toFixed(1)}% weighted borrow APY`,
    }
  }, [metricsPools])

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

  const filteredPools = useMemo(() => {
    let pools =
      activeProtocol === "All Pools"
        ? allPools
        : protocols[activeProtocol].map((pool) => ({
            ...pool,
            protocol: activeProtocol,
          }))

    pools = pools.filter(
      (pool) =>
        pool.name.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
        pool.protocol.toLowerCase().includes(deferredSearchQuery.toLowerCase()),
    )

    return [...pools].sort((left, right) => {
      switch (sortBy) {
        case "apy":
          return right.apy - left.apy
        case "tvl":
          return right.tvl - left.tvl
        case "volume":
          return right.volume24h - left.volume24h
        default:
          return 0
      }
    })
  }, [activeProtocol, allPools, deferredSearchQuery, protocols, sortBy])

  const totalPages = Math.ceil(filteredPools.length / itemsPerPage)
  const paginatedPools = filteredPools.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

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

          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search pools..."
                className="bg-background pl-9"
                value={searchQuery}
                onChange={(event) => {
                  setCurrentPage(1)
                  setSearchQuery(event.target.value)
                }}
              />
            </div>

            <Tabs
              defaultValue="All Pools"
              value={activeProtocol}
              onValueChange={(value) => {
                setCurrentPage(1)
                setActiveProtocol(value)
              }}
              className="w-full"
            >
              <TabsList className="h-auto w-full flex-wrap gap-2 bg-muted/50 p-1">
                {protocolNames.map((protocol) => (
                  <TabsTrigger key={protocol} value={protocol} className="rounded-md">
                    {protocol}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="mb-4 mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min(itemsPerPage, paginatedPools.length)} of {filteredPools.length} pools
              {activeProtocol !== "All Pools" && ` in ${activeProtocol}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {paginatedPools.map((pool) => (
              <PoolCard
                key={`${pool.protocol}-${pool.name}`}
                pool={pool}
                activeProtocol={activeProtocol}
                protocolLogos={protocolLogos}
              />
            ))}
          </div>

          {filteredPools.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="mb-2 text-lg font-semibold">No pools found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters to find what you're looking for.
              </p>
            </div>
          ) : null}

          {filteredPools.length > 0 ? (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          ) : null}
        </div>
      </main>
    </div>
  )
}
