"use client"

import * as React from "react"
import type { KeyMetricId, PoolDetail, TimeRangeId } from "@/app/lib/borrow-detail"
import { formatPct } from "@/app/lib/borrow-detail"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { LightweightChart, MetricChipRow, RangeTabs, SectionCard } from "../ui"
import { keyMetricChips, labelForKeyMetric } from "../lib/selectors"

type Props = { detail: PoolDetail }

// Deeper cuts only — the hero already covers TVL/Volume/Fees/Price.
const SECONDARY_METRICS: KeyMetricId[] = [
  "feesApr",
  "rewards",
  "utilization",
  "borrowApr",
  "incentives",
  "depth2pct",
  "volatility30d",
  "impermanentLoss",
  "oraclePremium",
]

const PCT_METRICS: ReadonlySet<KeyMetricId> = new Set<KeyMetricId>([
  "feesApr",
  "utilization",
  "borrowApr",
  "volatility30d",
  "impermanentLoss",
  "oraclePremium",
])

export function KeyMetricsCard({ detail }: Props) {
  const [range, setRange] = React.useState<TimeRangeId>("1M")
  const [metric, setMetric] = React.useState<KeyMetricId>("feesApr")

  const allChips = React.useMemo(() => keyMetricChips(detail.keyMetrics, range), [detail.keyMetrics, range])
  const chips = React.useMemo(() => allChips.filter((c) => SECONDARY_METRICS.includes(c.id)), [allChips])
  const series = detail.keyMetrics[metric][range]

  return (
    <SectionCard
      title="Deeper metrics"
      subtitle="Secondary indicators the risk council reviews for this pool."
      bodyClassName="p-0"
      rightSlot={<RangeTabs value={range} onChange={setRange} />}
    >
      <div className="flex flex-col">
        <div className="px-6 pb-4 pt-6">
          <MetricChipRow chips={chips} value={metric} onChange={setMetric} ariaLabel="Deeper metric" variant="cards" className="grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3" />
        </div>
        <div className="h-[280px] w-full pt-2">
          <LightweightChart
            series={series}
            type="area"
            height={280}
            accentClassName={detail.hero.visuals.map((visual) => visual.textClass)}
            ariaLabel={`${labelForKeyMetric(metric)} over ${range}`}
            formatValue={(v) => (PCT_METRICS.has(metric) ? formatPct(v, 2) : formatCompactUsd(v))}
          />
        </div>
      </div>
    </SectionCard>
  )
}
