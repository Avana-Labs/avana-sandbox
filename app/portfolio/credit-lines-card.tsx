"use client"

import { Info } from "lucide-react"
import { HOME_COLLATERAL_POOLS, HOME_INITIAL_DEBTS, HOME_PORTFOLIO_SUMMARY } from "@/app/lib/home-sim"

type RingProps = {
  value: number
  max: number
  label: string
  helper: string
  toneClassName: string
  valueLabel: string
}

function CreditRing({ value, max, label, helper, toneClassName, valueLabel }: RingProps) {
  const size = 224
  const stroke = 18
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, value / max))
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative size-[224px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={stroke}
            className="opacity-45"
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
            className={toneClassName}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-5">
          <div className="font-data text-[48px] font-bold leading-none tracking-[-0.04em] text-foreground">
            {valueLabel}
          </div>
          <div className="mt-2 text-[16px] font-medium tracking-tight text-foreground">{label}</div>
          <div className="mt-1 text-[13px] leading-snug text-muted-foreground">{helper}</div>
        </div>
      </div>
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
    <section className="space-y-5">
      <div className="flex items-center gap-2 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">
        <span>You are approved for</span>
        <span className="font-data tabular-nums text-[#01AACF]">${approvedUsd.toLocaleString("en-US")}</span>
        <Info className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <CreditRing
          value={creditHealthScore}
          max={5}
          label="Credit Health"
          helper="Higher is safer"
          toneClassName="text-emerald-500"
          valueLabel={creditHealthScore.toFixed(1)}
        />
        <CreditRing
          value={currentLtvPct}
          max={100}
          label="Current LTV"
          helper="Borrow power used"
          toneClassName="text-emerald-500"
          valueLabel={`${currentLtvPct.toFixed(2)}%`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px] text-muted-foreground">
        <div>
          Approved <span className="font-data font-medium tabular-nums text-foreground">${approvedUsd.toLocaleString("en-US")}</span>
        </div>
        <div>
          Collateral <span className="font-data font-medium tabular-nums text-foreground">${totalCollateral.toLocaleString("en-US")}</span>
        </div>
        <div>
          Borrowed <span className="font-data font-medium tabular-nums text-foreground">${totalBorrowed.toLocaleString("en-US")}</span>
        </div>
      </div>
    </section>
  )
}
