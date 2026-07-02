"use client"

import type { LendMarketDetail } from "@/app/lib/lend-detail"
import { MetricTrendCard } from "@/app/borrow/_detail/ui"
import { formatPct } from "@/app/lib/borrow-detail"
import { useCurrency } from "@/app/lib/currency/use-currency"

type Props = {
  detail: LendMarketDetail
}

export function SupplyCard({ detail }: Props) {
  const { compact } = useCurrency()

  return (
    <MetricTrendCard
      title="Supply & Utilization"
      subtitle="Deposits, borrows, and utilization over time."
      seriesByView={detail.supplyBorrow}
      accentClassNameByView={{ supplied: detail.hero.visual.textClass }}
      formatValue={(view, value) => (view === "utilization" ? formatPct(value, 2) : compact(value))}
    />
  )
}
