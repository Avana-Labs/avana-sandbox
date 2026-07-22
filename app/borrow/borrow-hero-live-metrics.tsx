"use client"

import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"

export type BorrowHeroMetrics = {
  totalTvlUsd: number
  totalCollateralUsd: number
  availableCreditUsd: number
  outstandingLoansUsd: number
  totalTvlChangePct: number
}

function MetricsView({ metrics }: { metrics: BorrowHeroMetrics }) {
  const fc = useCurrency()
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-end md:justify-between md:gap-4">
      {/* Mobile: label + value inline on one row. Desktop: stacked as before. */}
      <div className="flex items-baseline justify-between gap-x-3 md:block md:min-w-0">
        <p className="text-[12px] font-medium tracking-tight text-muted-foreground">{t("Total TVL")}</p>
        <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
          {fc.compact(metrics.totalTvlUsd)}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-5 md:ml-auto md:text-right">
        <div className="flex items-baseline justify-between md:block">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground md:mb-1 md:justify-end">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            {t("Available Credit")}
          </div>
          <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
            {fc.compact(metrics.availableCreditUsd)}
          </p>
        </div>

        <div className="flex items-baseline justify-between md:block">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground md:mb-1 md:justify-end">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            {t("Outstanding Loans")}
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
