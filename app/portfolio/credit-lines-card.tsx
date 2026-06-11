"use client"

import { HOME_INITIAL_DEBTS, HOME_PORTFOLIO_SUMMARY } from "@/app/lib/home-sim"

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

function StoryMetric({
  value,
  label,
  delta,
  deltaTone,
}: {
  value: string
  label: string
  delta?: string
  deltaTone?: "positive" | "negative"
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="font-data text-[clamp(1.55rem,2.2vw,2.35rem)] font-semibold leading-none tracking-[-0.04em] text-foreground">
          {value}
        </div>
        {delta && deltaTone ? <DeltaBadge value={delta} tone={deltaTone} /> : null}
      </div>
      <div className="text-[clamp(0.78rem,0.85vw,0.92rem)] font-normal leading-tight tracking-tight text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

export function CreditLinesCard() {
  const totalBorrowed = Object.values(HOME_INITIAL_DEBTS).reduce((sum, value) => sum + value, 0)
  const approvedUsd = HOME_PORTFOLIO_SUMMARY.availableUsd

  return (
    <section className="w-full space-y-5">
      <div className="grid w-full grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4 md:gap-x-10 md:gap-y-6">
        <StoryMetric
          value={`$${approvedUsd.toLocaleString("en-US")}`}
          label="You&apos;re approved for"
          delta="+3.8%"
          deltaTone="positive"
        />
        <StoryMetric value="2.3" label="Credit Health" delta="+0.2%" deltaTone="positive" />
        <StoryMetric value="13.89%" label="Current LTV" delta="-2.1%" deltaTone="positive" />
        <StoryMetric value={`$${totalBorrowed.toLocaleString("en-US")}`} label="You borrowed" delta="+4.4%" deltaTone="negative" />
      </div>

      <div className="w-full border-t border-border/80 pt-1" />
    </section>
  )
}
