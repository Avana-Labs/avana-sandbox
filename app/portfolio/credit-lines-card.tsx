"use client"

import type { ReactNode } from "react"
import { BarChart3, CircleDollarSign, Info, Landmark } from "lucide-react"
import { HOME_COLLATERAL_POOLS, HOME_INITIAL_DEBTS, HOME_PORTFOLIO_SUMMARY } from "@/app/lib/home-sim"
import { cn } from "@/lib/utils"

type GaugeTone = "safe" | "caution"

type GaugeProps = {
  value: number
  max: number
  headline: string
  title: string
  delta: string
  status: string
  tone: GaugeTone
}

const TONE_CLASS: Record<GaugeTone, string> = {
  safe: "text-[#2f9427]",
  caution: "text-[#01AACF]",
}

function arcPath(cx: number, cy: number, r: number) {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
}

function pointOnArc(cx: number, cy: number, r: number, progress: number) {
  const angle = Math.PI * (1 - progress)
  return {
    x: cx + Math.cos(angle) * r,
    y: cy - Math.sin(angle) * r,
  }
}

function CreditGauge({ value, max, headline, title, delta, status, tone }: GaugeProps) {
  const width = 360
  const height = 226
  const cx = width / 2
  const cy = 168
  const radius = 132
  const progress = Math.max(0.08, Math.min(0.92, value / max))
  const end = pointOnArc(cx, cy, radius, progress)

  return (
    <div className="flex flex-col items-center text-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-[360px] overflow-visible">
        <path
          d={arcPath(cx, cy, radius)}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="18"
          strokeLinecap="round"
          className="opacity-5"
        />
        <path
          d={arcPath(cx, cy, radius)}
          fill="none"
          stroke="currentColor"
          strokeWidth="18"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${progress * 100} 100`}
          className={cn("transition-all duration-500", TONE_CLASS[tone])}
        />
        <circle cx={end.x} cy={end.y} r="7" className={cn("fill-current", TONE_CLASS[tone])} />

        <text
          x={cx}
          y="125"
          textAnchor="middle"
          className="fill-foreground font-data font-bold tracking-[-0.05em]"
          style={{ fontSize: 54 }}
        >
          {headline}
        </text>
        <text
          x={cx}
          y="161"
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: 18, fontWeight: 600 }}
        >
          {title}
        </text>
        <text
          x={cx - 6}
          y="193"
          textAnchor="end"
          className={cn("fill-current", TONE_CLASS[tone])}
          style={{ fontSize: 17, fontWeight: 700 }}
        >
          {delta}
        </text>
        <text
          x={cx}
          y="193"
          textAnchor="start"
          className="fill-foreground"
          style={{ fontSize: 17 }}
        >
          • {status}
        </text>
        <text
          x={cx}
          y="218"
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 15 }}
        >
          Checked daily
        </text>
      </svg>
    </div>
  )
}

function MetricRow({
  icon,
  title,
  subtitle,
  value,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border/80 py-5 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-[#2f9427]">{icon}</div>
        <div>
          <div className="text-[15px] font-medium tracking-tight text-foreground">{title}</div>
          {subtitle ? <div className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</div> : null}
        </div>
      </div>
      <div className="font-data text-[16px] font-medium tabular-nums text-foreground">{value}</div>
    </div>
  )
}

export function CreditLinesCard() {
  const totalCollateral = HOME_COLLATERAL_POOLS.reduce((sum, pool) => sum + pool.collateralUsd, 0)
  const totalBorrowed = Object.values(HOME_INITIAL_DEBTS).reduce((sum, value) => sum + value, 0)
  const approvedUsd = HOME_PORTFOLIO_SUMMARY.availableUsd
  const creditHealthScore = HOME_PORTFOLIO_SUMMARY.averageHealthFactor
  const currentLtvPct = totalCollateral > 0 ? (totalBorrowed / totalCollateral) * 100 : 0

  return (
    <section className="space-y-7">
      <div className="text-[16px] font-semibold tracking-tight text-foreground">Today</div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-10">
        <CreditGauge
          value={creditHealthScore}
          max={5}
          headline={creditHealthScore.toFixed(1)}
          title="Credit Health"
          delta="+0.2 pts"
          status="Safe"
          tone="safe"
        />
        <CreditGauge
          value={currentLtvPct}
          max={100}
          headline={`${currentLtvPct.toFixed(2)}%`}
          title="Current LTV"
          delta="-2.1 pts"
          status="Low usage"
          tone="caution"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-center">
        <span className="rounded-xl bg-[#2f9427]/12 px-3 py-1 text-[14px] font-medium text-[#2f9427]">New</span>
        <span className="text-[15px] text-foreground">Daily borrowing profile checks from Avana</span>
      </div>

      <div className="flex items-center justify-center gap-2 text-center text-[14px] text-muted-foreground">
        <span>Borrowing metrics checked daily with live collateral tracking</span>
        <Info className="h-4 w-4" />
      </div>

      <div className="max-w-[840px]">
        <MetricRow
          icon={<BarChart3 className="h-5 w-5" />}
          title="Approved to borrow"
          value={`$${approvedUsd.toLocaleString("en-US")}`}
        />
        <MetricRow
          icon={<Landmark className="h-5 w-5" />}
          title="LP collateral value"
          subtitle="Across all supplied LP positions"
          value={`$${totalCollateral.toLocaleString("en-US")}`}
        />
        <MetricRow
          icon={<CircleDollarSign className="h-5 w-5" />}
          title="Outstanding borrows"
          subtitle="Current borrowed balance"
          value={`$${totalBorrowed.toLocaleString("en-US")}`}
        />
      </div>
    </section>
  )
}
