"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { BorrowSnapshot, BorrowSpokeBreakdown } from "./borrow-hero-state"

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

function formatHealth(value: number | null) {
  return value == null ? "—" : value.toFixed(2)
}

function DeltaBadge({
  value,
  tone,
}: {
  value: string
  tone: "positive" | "negative"
}) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[0.72rem] font-medium leading-none tabular-nums",
        tone === "positive" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500",
      ].join(" ")}
    >
      {value}
    </span>
  )
}

function MetricBreakdown({
  description,
  breakdown,
  renderValue,
}: {
  description: string
  breakdown?: BorrowSpokeBreakdown[]
  renderValue: (row: BorrowSpokeBreakdown) => string
}) {
  if (!breakdown?.length) {
    return <div className="max-w-[220px] text-[11.5px] leading-relaxed text-muted-foreground">{description}</div>
  }

  return (
    <div className="w-[240px] space-y-2">
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">{description}</p>
      <div className="space-y-1.5">
        {breakdown.map((row) => (
          <div key={row.spokeId} className="flex items-center justify-between gap-3 text-[11.5px]">
            <span className="min-w-0 truncate text-foreground">{row.label}</span>
            <span className="shrink-0 font-medium text-foreground">{renderValue(row)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StoryMetric({
  value,
  label,
  delta,
  deltaTone,
  description,
  breakdown,
  renderBreakdown,
}: {
  value: string
  label: string
  delta?: string
  deltaTone?: "positive" | "negative"
  description?: string
  breakdown?: BorrowSpokeBreakdown[]
  renderBreakdown?: (row: BorrowSpokeBreakdown) => string
}) {
  const content = (
    <div className="space-y-1 rounded-radius-sm px-1 py-1 transition-colors hover:bg-surface-inset/50">
      <div className="flex flex-wrap items-end gap-2">
        <div className="font-data text-[clamp(1.3rem,1.7vw,1.85rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
          {value}
        </div>
        {delta && deltaTone ? <DeltaBadge value={delta} tone={deltaTone} /> : null}
      </div>
      <div className="text-[12px] font-normal leading-tight tracking-tight text-muted-foreground">
        {label}
      </div>
    </div>
  )

  if (!description || !renderBreakdown) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top" align="start" className="border-border bg-background/98 p-3 shadow-elev-2">
        <MetricBreakdown description={description} breakdown={breakdown} renderValue={renderBreakdown} />
      </TooltipContent>
    </Tooltip>
  )
}

export function CreditLinesCard({
  creditLines,
}: {
  creditLines: BorrowSnapshot
}) {
  const averageHealthFactor = creditLines.averageHealthFactor
  const availableCredit = creditLines.approvedUsd
  const liquidationBuffer = Math.max(0, creditLines.liquidationThresholdUsd - creditLines.totalBorrowedUsd)
  const totalBorrowed = creditLines.totalBorrowedUsd
  const creditHealthTone =
    averageHealthFactor == null ? undefined : averageHealthFactor >= 1.5 ? "positive" : "negative"

  return (
    <TooltipProvider delayDuration={120}>
      <section className="w-full space-y-4">
        <div className="grid w-full grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4 md:gap-x-8 md:gap-y-5">
          <StoryMetric
            value={formatUsd(availableCredit)}
            label="Available Credit"
            description="Wallet-wide aggregate of remaining borrowing power across every active borrow spoke."
            breakdown={creditLines.spokeBreakdown}
            renderBreakdown={(row) => formatUsd(row.availableCreditUsd)}
          />
          <StoryMetric
            value={formatHealth(averageHealthFactor)}
            label="Credit Health"
            delta={averageHealthFactor ? (averageHealthFactor >= 1.5 ? "GOOD" : "WATCH") : undefined}
            deltaTone={creditHealthTone}
            description="Wallet-wide health factor from total liquidation value divided by total borrowed, with per-spoke health underneath."
            breakdown={creditLines.spokeBreakdown}
            renderBreakdown={(row) => formatHealth(row.healthFactor)}
          />
          <StoryMetric
            value={formatUsd(liquidationBuffer)}
            label="Liquidation Buffer"
            description="Wallet-wide distance from liquidation. Hover to inspect how much room each spoke still has."
            breakdown={creditLines.spokeBreakdown}
            renderBreakdown={(row) => formatUsd(row.liquidationBufferUsd)}
          />
          <StoryMetric
            value={formatUsd(totalBorrowed)}
            label="Total Borrowed"
            description="Outstanding debt across all borrow spokes for this wallet."
            breakdown={creditLines.spokeBreakdown}
            renderBreakdown={(row) => formatUsd(row.totalBorrowedUsd)}
          />
        </div>
      </section>
    </TooltipProvider>
  )
}
