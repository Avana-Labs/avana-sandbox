"use client"

import type { AssetDetail } from "@/app/lib/borrow-detail"
import { formatPct } from "@/app/lib/borrow-detail"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { MetricTrendCard } from "../ui"

type Props = { detail: AssetDetail; id?: string }

export function SupplyBorrowCard({ detail, id }: Props) {
  const { compact } = useCurrency()
  return (
    <MetricTrendCard
      id={id}
      title="Supply & Borrow"
      subtitle="Protocol-wide supplied vs borrowed for this asset."
      seriesByView={detail.supplyBorrow}
      accentClassNameByView={{
        supplied: detail.hero.visual.textClass,
        utilization: "text-sky-700",
      }}
      formatValue={(view, value) => (view === "utilization" ? formatPct(value, 2) : compact(value))}
    />
  )
}
