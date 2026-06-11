"use client"

import type { ReactNode } from "react"
import { BarChart3, CircleDollarSign, Landmark } from "lucide-react"
import { HOME_COLLATERAL_POOLS, HOME_INITIAL_DEBTS, HOME_PORTFOLIO_SUMMARY } from "@/app/lib/home-sim"

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

  return (
    <section className="max-w-[900px] space-y-5">
      <div className="grid max-w-[1120px] gap-6 md:grid-cols-4 md:gap-8">
        <div className="space-y-2">
          <div className="font-data text-[38px] font-bold leading-none tracking-[-0.05em] text-foreground">
            ${approvedUsd.toLocaleString("en-US")}
          </div>
          <div className="text-[18px] font-semibold tracking-tight text-foreground">You&apos;re approved for</div>
        </div>

        <div className="space-y-2">
          <div className="font-data text-[38px] font-bold leading-none tracking-[-0.05em] text-foreground">2.3</div>
          <div className="text-[18px] font-semibold tracking-tight text-foreground">Credit Health</div>
        </div>

        <div className="space-y-2">
          <div className="font-data text-[38px] font-bold leading-none tracking-[-0.05em] text-foreground">13.89%</div>
          <div className="text-[18px] font-semibold tracking-tight text-foreground">Current LTV</div>
        </div>

        <div className="space-y-2">
          <div className="font-data text-[38px] font-bold leading-none tracking-[-0.05em] text-foreground">
            ${totalBorrowed.toLocaleString("en-US")}
          </div>
          <div className="text-[18px] font-semibold tracking-tight text-foreground">You borrowed</div>
        </div>
      </div>

      <div className="max-w-[900px] border-t border-border/80 pt-1">
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
