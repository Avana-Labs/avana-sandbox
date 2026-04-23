"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { formatPct } from "@/app/lib/borrow-detail"
import { LightweightChart, SectionCard } from "../ui"

type View = "supplied" | "borrowed" | "utilization"

type Props = { detail: AssetDetail }

const VIEW_LABEL: Record<View, string> = {
  supplied: "Supplied",
  borrowed: "Borrowed",
  utilization: "Utilization",
}

export function SupplyBorrowCard({ detail }: Props) {
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
    <SectionCard
      title="Supply & Borrow"
      subtitle="Protocol-wide supplied vs borrowed for this asset."
      bodyClassName="p-0"
      rightSlot={
        <div role="tablist" className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-0.5">
          {(Object.keys(VIEW_LABEL) as View[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "h-7 rounded-full px-2.5 text-xs font-medium tabular-nums transition-colors",
                view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="h-[240px] w-full pt-4">
          <LightweightChart
            series={series}
            type="area"
            height={240}
            tone={tone}
            accentClassName={accentClassName}
            ariaLabel={`${VIEW_LABEL[view]} over time`}
            formatValue={(v) => (view === "utilization" ? formatPct(v, 2) : formatCompactUsd(v))}
          />
        </div>
        <dl className="grid grid-cols-3 gap-4 px-6 pb-6 text-sm">
          <Stat label="Supplied" value={detail.quickStats.find((s) => s.id === "supplied")?.value ?? "—"} />
          <Stat label="Borrowed" value={detail.quickStats.find((s) => s.id === "borrowed")?.value ?? "—"} />
          <Stat label="Utilization" value={detail.quickStats.find((s) => s.id === "utilization")?.value ?? "—"} />
        </dl>
      </div>
    </SectionCard>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-data text-base font-medium tabular-nums text-foreground">{value}</div>
    </div>
  )
}
