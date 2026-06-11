"use client"

import { Info } from "lucide-react"
import { HOME_COLLATERAL_POOLS, HOME_INITIAL_DEBTS, HOME_PORTFOLIO_SUMMARY } from "@/app/lib/home-sim"
import { cn } from "@/lib/utils"

type RingTone = "safe" | "caution"

type RingProps = {
  value: number
  max: number
  label: string
  helper: string
  valueLabel: string
  tone: RingTone
}

const RING_TONE_CLASS: Record<RingTone, string> = {
  safe: "text-emerald-500",
  caution: "text-[#01AACF]",
}

function CreditRing({ value, max, label, helper, valueLabel, tone }: RingProps) {
  const size = 176
  const stroke = 14
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0.08, Math.min(1, value / max))
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center rounded-[28px] border border-border/70 bg-white px-5 py-6 text-center shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
      <div className="relative size-44">
        <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={stroke}
            className="opacity-35"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn("transition-all", RING_TONE_CLASS[tone])}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div className="font-data text-[36px] font-bold leading-none tracking-[-0.05em] text-foreground">
            {valueLabel}
          </div>
          <div className="mt-2 text-[18px] font-medium tracking-tight text-foreground">{label}</div>
          <div className="mt-1 text-[13px] leading-snug text-muted-foreground">{helper}</div>
        </div>
      </div>
    </div>
  )
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-raised px-4 py-3">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-data text-[18px] font-medium tabular-nums text-foreground">{value}</div>
    </div>
  )
}

function creditHealthTone(score: number): RingTone {
  if (score >= 2) return "safe"
  return "caution"
}

function ltvTone(ltvPct: number): RingTone {
  if (ltvPct <= 35) return "safe"
  return "caution"
}

export function CreditLinesCard() {
  const totalCollateral = HOME_COLLATERAL_POOLS.reduce((sum, pool) => sum + pool.collateralUsd, 0)
  const totalBorrowed = Object.values(HOME_INITIAL_DEBTS).reduce((sum, value) => sum + value, 0)
  const approvedUsd = HOME_PORTFOLIO_SUMMARY.availableUsd
  const creditHealthScore = HOME_PORTFOLIO_SUMMARY.averageHealthFactor
  const currentLtvPct = totalCollateral > 0 ? (totalBorrowed / totalCollateral) * 100 : 0

  return (
    <section className="overflow-hidden rounded-[32px] border border-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="border-b border-border/70 px-6 py-5 md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#01AACF]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#01AACF]">
              Credit Overview
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">
              <span>You are approved for</span>
              <span className="font-data text-[30px] font-bold tabular-nums tracking-[-0.04em] text-[#01AACF]">
                ${approvedUsd.toLocaleString("en-US")}
              </span>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="max-w-[40rem] text-[13px] leading-snug text-muted-foreground">
              A quick view of your borrowing capacity and overall position health.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
            <InlineStat label="Collateral" value={`$${totalCollateral.toLocaleString("en-US")}`} />
            <InlineStat label="Borrowed" value={`$${totalBorrowed.toLocaleString("en-US")}`} />
            <InlineStat label="Available" value={`$${approvedUsd.toLocaleString("en-US")}`} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 px-6 py-6 md:px-8 lg:grid-cols-2">
        <CreditRing
          value={creditHealthScore}
          max={5}
          label="Credit Health"
          helper="Higher is safer"
          valueLabel={creditHealthScore.toFixed(1)}
          tone={creditHealthTone(creditHealthScore)}
        />
        <CreditRing
          value={currentLtvPct}
          max={100}
          label="Current LTV"
          helper="Borrow power used"
          valueLabel={`${currentLtvPct.toFixed(2)}%`}
          tone={ltvTone(currentLtvPct)}
        />
      </div>
    </section>
  )
}
