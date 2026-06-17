"use client"

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
    <div className="space-y-1">
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
}

export function CreditLinesCard({
  creditLines,
}: {
  creditLines: {
    approvedUsd: number
    averageHealthFactor: number | null
    currentLtvPct: number
    totalBorrowedUsd: number
    totalCollateralUsd: number
  }
}) {
  const approvedUsd = creditLines.approvedUsd
  const averageHealthFactor = creditLines.averageHealthFactor
  const currentLtv = creditLines.currentLtvPct
  const totalBorrowed = creditLines.totalBorrowedUsd

  return (
    <section className="w-full space-y-4">
      <div className="grid w-full grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4 md:gap-x-8 md:gap-y-5">
        <StoryMetric
          value={`$${approvedUsd.toLocaleString("en-US")}`}
          label="You&apos;re approved for"
          delta="+3.8%"
          deltaTone="positive"
        />
        <StoryMetric
          value={averageHealthFactor ? averageHealthFactor.toFixed(2) : "—"}
          label="Credit Health"
          delta="+0.2 pts"
          deltaTone="positive"
        />
        <StoryMetric value={`${currentLtv.toFixed(2)}%`} label="Current LTV" delta="-2.1 pts" deltaTone="negative" />
        <StoryMetric value={`$${totalBorrowed.toLocaleString("en-US")}`} label="You borrowed" delta="+4.4%" deltaTone="negative" />
      </div>
    </section>
  )
}
