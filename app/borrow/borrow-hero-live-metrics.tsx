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
    <div className="flex w-full items-start justify-between gap-4 pb-4">
      <div className="min-w-0 space-y-1.5">
        <p className="text-[13px] text-muted-foreground">{t("Borrow TVL")}</p>
        <p className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-normal tabular-nums text-foreground">
          {fc.compact(metrics.totalTvlUsd)}
        </p>
      </div>

      <div className="hidden md:ml-auto md:flex md:gap-8 md:text-right">
        <div className="min-w-0 space-y-1.5">
          <p className="flex items-center justify-end gap-1.5 text-[13px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            {t("Available Credit")}
          </p>
          <p className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-normal tabular-nums text-foreground">
            {fc.compact(metrics.availableCreditUsd)}
          </p>
        </div>

        <div className="min-w-0 space-y-1.5">
          <p className="flex items-center justify-end gap-1.5 text-[13px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            {t("Outstanding Loans")}
          </p>
          <p className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-normal tabular-nums text-foreground">
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
