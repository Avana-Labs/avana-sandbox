"use client"

import * as React from "react"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { formatPct } from "@/app/lib/borrow-detail"
import { LightweightChart, SectionCard } from "../ui"

type Props = { detail: AssetDetail }

export function HistoricalUtilizationCard({ detail }: Props) {
  return (
    <SectionCard
      title="Historical utilization"
      subtitle="Borrowed ÷ supplied over the last 12 months."
      bodyClassName="p-0"
    >
      <div className="h-[220px] w-full pt-4">
        <LightweightChart
          series={detail.historicalUtilization}
          type="area"
          height={220}
          accentClassName={detail.hero.visual.textClass}
          ariaLabel="Historical utilization"
          formatValue={(v) => formatPct(v, 2)}
        />
      </div>
    </SectionCard>
  )
}
