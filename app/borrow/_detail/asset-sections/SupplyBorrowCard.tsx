"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { formatPct } from "@/app/lib/borrow-detail"
import { LightweightChart } from "../ui"

type View = "supplied" | "borrowed" | "utilization"

type Props = { detail: AssetDetail; id?: string }

const VIEW_LABEL: Record<View, string> = {
  supplied: "Supplied",
  borrowed: "Borrowed",
  utilization: "Utilization",
}

export function SupplyBorrowCard({ detail, id }: Props) {
  const [view, setView] = React.useState<View>("supplied")

  const series =
    view === "supplied"
      ? detail.supplyBorrow.supplied
      : view === "borrowed"
        ? detail.supplyBorrow.borrowed
        : detail.supplyBorrow.utilization

  const tone: "neutral" | "positive" | "negative" = view === "borrowed" ? "negative" : "neutral"
  const accentClassName =
    view === "supplied"
      ? detail.hero.visual.textClass
      : view === "utilization"
        ? "text-sky-700"
        : undefined

  return (
    <section id={id} className="min-w-0">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-foreground">Supply & Borrow</h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">Protocol-wide supplied vs borrowed for this asset.</p>
        </div>
        <div role="tablist" className="inline-flex items-center gap-0.5 rounded-xs border border-border bg-surface-inset p-0.5">
          {(Object.keys(VIEW_LABEL) as View[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "h-6 rounded-[3px] px-2 text-[11px] font-medium tabular-nums transition-colors",
                view === v ? "bg-surface-raised text-foreground shadow-elev-1" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      </div>
      <div className="relative w-full pt-4">
        <LightweightChart
          series={series}
          type="area"
          height={240}
          tone={tone}
          accentClassName={accentClassName}
          ariaLabel={`${VIEW_LABEL[view]} over time`}
          formatValue={(v) => (view === "utilization" ? formatPct(v, 2) : formatCompactUsd(v))}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-4 bottom-0 z-[7] w-14 bg-gradient-to-r from-background via-background/90 to-transparent"
        />
      </div>
    </section>
  )
}
