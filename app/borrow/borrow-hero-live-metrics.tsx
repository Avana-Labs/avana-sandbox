"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { cn } from "@/lib/utils"

export type BorrowHeroMetrics = {
  totalTvlUsd: number
  totalCollateralUsd: number
  availableCreditUsd: number
  outstandingLoansUsd: number
  totalTvlChangePct: number
}

function MetricsView({ metrics }: { metrics: BorrowHeroMetrics }) {
  const fc = useCurrency()
  const changeIsUp = metrics.totalTvlChangePct >= 0
  const changeLabel = `${changeIsUp ? "+" : ""}${metrics.totalTvlChangePct.toFixed(2)}%`
  return (
    <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[12px] font-medium tracking-tight text-muted-foreground">Total TVL</p>
            <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
              {fc.compact(metrics.totalTvlUsd)}
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-data text-[11px] font-medium tabular-nums",
                changeIsUp ? "text-apy-positive" : "text-rose-700",
              )}
            >
              <span aria-hidden className="text-[10px] leading-none">
                {changeIsUp ? "▲" : "▼"}
              </span>
              {changeLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:ml-auto md:text-right">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-hero-metric-emerald md:justify-end">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7ec39f]" />
            Total Collateral
          </div>
          <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
            {fc.compact(metrics.totalCollateralUsd)}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-hero-metric-violet md:justify-end">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a092ef]" />
            Available Credit
          </div>
          <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
            {fc.compact(metrics.availableCreditUsd)}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-hero-metric-amber md:justify-end">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c29f78]" />
            Outstanding Loans
          </div>
          <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
            {fc.compact(metrics.outstandingLoansUsd)}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Reads the calibrated borrow economy from Convex; falls back to the server value. */
function ConvexMetrics({ fallback }: { fallback: BorrowHeroMetrics }) {
  const economy = useQuery(api.markets.getBorrowEconomy)
  if (!economy) return <MetricsView metrics={fallback} />
  // Pool TVL is the canonical collateral, so Total TVL tracks it too.
  return (
    <MetricsView
      metrics={{
        totalTvlUsd: economy.totalCollateralUsd,
        totalCollateralUsd: economy.totalCollateralUsd,
        availableCreditUsd: economy.availableCreditUsd,
        outstandingLoansUsd: economy.outstandingLoansUsd,
        totalTvlChangePct: fallback.totalTvlChangePct,
      }}
    />
  )
}

/**
 * Borrow hero headline metrics. When Convex is wired the totals come from the
 * seeded market data layer (getBorrowEconomy); otherwise they fall back to the
 * server-rendered catalog values so the page still paints.
 */
export function BorrowHeroLiveMetrics({ fallback }: { fallback: BorrowHeroMetrics }) {
  if (!hasConvexClient) return <MetricsView metrics={fallback} />
  return <ConvexMetrics fallback={fallback} />
}
