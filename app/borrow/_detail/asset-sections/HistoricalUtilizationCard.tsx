"use client"

import * as React from "react"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { formatPct } from "@/app/lib/borrow-detail"
import { LightweightChart } from "../ui"

type Props = { detail: AssetDetail }

export function HistoricalUtilizationCard({ detail }: Props) {
  return (
    <section className="min-w-0">
      <div className="mb-3">
        <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-[hsl(var(--brand))]">
          Historical utilization
        </h2>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">Borrowed ÷ supplied over the last 12 months.</p>
      </div>
      <div className="relative w-full pt-4">
        <LightweightChart
          series={detail.historicalUtilization}
          type="area"
          height={220}
          accentClassName={detail.hero.visual.textClass}
          ariaLabel="Historical utilization"
          formatValue={(v) => formatPct(v, 2)}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-4 bottom-0 z-[7] w-14 bg-gradient-to-r from-background via-background/90 to-transparent"
        />
      </div>
    </section>
  )
}
