"use client"

import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { MetricTrendCard } from "@/app/borrow/_detail/ui"
import { formatPct } from "@/app/lib/borrow-detail"
import { useCurrency } from "@/app/lib/currency/use-currency"

type Props = {
  detail: MultiplyMarketDetail
}

export function SupplyBorrowCard({ detail }: Props) {
  const { compact } = useCurrency()

  return (
    <MetricTrendCard
      title="Supply & Borrow"
      subtitle="Leverage usage across this market over time."
      seriesByView={detail.supplyBorrow}
      accentClassNameByView={{
        supplied: detail.hero.visuals[0].textClass,
        borrowed: detail.hero.visuals[1].textClass,
      }}
      formatValue={(view, value) => (view === "utilization" ? formatPct(value, 2) : compact(value))}
    />
  )
}
