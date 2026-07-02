"use client"

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

      <div className="grid grid-cols-3 gap-2.5 sm:gap-5 md:ml-auto md:text-right">
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

/**
 * Borrow hero headline metrics. The caller owns which page-data snapshot is
 * current (server fallback vs session-backed client refresh), so this stays a
 * pure view over one consistent metrics object.
 */
export function BorrowHeroLiveMetrics({ metrics }: { metrics: BorrowHeroMetrics }) {
  return <MetricsView metrics={metrics} />
}
