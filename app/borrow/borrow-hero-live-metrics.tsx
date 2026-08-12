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
    <div className="grid w-full grid-cols-3 gap-x-3 pb-4 md:flex md:items-end md:justify-between md:gap-4">
      <div className="min-w-0">
        <p className="text-[12px] font-medium tracking-tight text-muted-foreground">{t("Total TVL")}</p>
        <p className="mt-1 font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
          {fc.compact(metrics.totalTvlUsd)}
        </p>
      </div>

      <div className="contents md:ml-auto md:flex md:gap-5 md:text-right">
        <div className="min-w-0">
          <div className="mb-0 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground md:mb-1 md:justify-end">
            <span className="hidden h-1.5 w-1.5 rounded-full bg-muted-foreground md:inline-block" />
            {t("Available Credit")}
          </div>
          <p className="mt-1 font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[1rem] md:font-semibold">
            {fc.compact(metrics.availableCreditUsd)}
          </p>
        </div>

        <div className="min-w-0 text-right">
          <div className="mb-0 flex items-center justify-end gap-1.5 text-[12px] font-medium text-muted-foreground md:mb-1">
            <span className="hidden h-1.5 w-1.5 rounded-full bg-muted-foreground md:inline-block" />
            {t("Outstanding Loans")}
          </div>
          <p className="mt-1 font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[1rem] md:font-semibold">
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
