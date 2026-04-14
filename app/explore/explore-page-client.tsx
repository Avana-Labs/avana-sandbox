"use client"

import { memo, useCallback, useDeferredValue, useMemo, useState } from "react"
import Image from "next/image"
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { PageIntro } from "../components/page-intro"
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
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const sortBy = "apy"
  const protocolNames = useMemo(() => Object.keys(protocols), [protocols])

  const timeframeMultiplier = useMemo(() => {
    switch (timeframe) {
      case "24h":
        return 1
      case "7d":
        return 2.5
      case "30d":
        return 4.2
      default:
        return 1
    }
  }, [timeframe])

  const metricsData = useMemo(
    () => ({
      tvl: {
        value: 72.4,
        change: 5.2 * timeframeMultiplier,
        isPositive: true,
      },
      volume: {
        value: 321.2,
        change: 8.7 * timeframeMultiplier,
        isPositive: true,
      },
      apy: {
        value: 15.5,
        change: -0.8 * timeframeMultiplier,
        isPositive: false,
      },
    }),
    [timeframeMultiplier],
  )

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
          <PageIntro
            title="Borrow"
            titleClassName="text-2xl font-semibold leading-tight tracking-tight md:text-3xl"
            description="Borrow against LP positions."
            descriptionClassName="text-sm"
          >
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={timeframe === "24h" ? "default" : "outline"} onClick={() => setTimeframe("24h")}>
                24h Change
              </Button>
              <Button size="sm" variant={timeframe === "7d" ? "default" : "outline"} onClick={() => setTimeframe("7d")}>
                7d Change
              </Button>
              <Button size="sm" variant={timeframe === "30d" ? "default" : "outline"} onClick={() => setTimeframe("30d")}>
                30d Change
              </Button>
            </div>
          </PageIntro>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-border/60 bg-card">
              <CardContent className="px-4 pb-2 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Total TVL</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-data text-2xl font-bold">${metricsData.tvl.value}B</span>
                    <span className={`font-data text-sm font-medium ${metricsData.tvl.isPositive ? "text-emerald-600" : "text-red-600"}`}>
                      {metricsData.tvl.change > 0 ? "+" : ""}
                      {metricsData.tvl.change.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-[60px] -mx-4 -mb-2">
                  <EnhancedGraph isPositive={metricsData.tvl.isPositive} points={24} height={60} seed="explore-tvl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card">
              <CardContent className="px-4 pb-2 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Total Volume</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-data text-2xl font-bold">${metricsData.volume.value}B</span>
                    <span
                      className={`font-data text-sm font-medium ${metricsData.volume.isPositive ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {metricsData.volume.change > 0 ? "+" : ""}
                      {metricsData.volume.change.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-[60px] -mx-4 -mb-2">
                  <EnhancedGraph isPositive={metricsData.volume.isPositive} points={24} height={60} seed="explore-volume" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card">
              <CardContent className="px-4 pb-2 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Average APY</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-data text-2xl font-bold">{metricsData.apy.value}%</span>
                    <span className={`font-data text-sm font-medium ${metricsData.apy.isPositive ? "text-emerald-600" : "text-red-600"}`}>
                      {metricsData.apy.change > 0 ? "+" : ""}
                      {metricsData.apy.change.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-[60px] -mx-4 -mb-2">
                  <EnhancedGraph isPositive={metricsData.apy.isPositive} points={24} height={60} seed="explore-apy" />
                </div>
              </CardContent>
            </Card>
          </div>

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
