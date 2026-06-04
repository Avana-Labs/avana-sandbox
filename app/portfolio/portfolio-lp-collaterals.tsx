"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { HOME_COLLATERAL_POOLS, HOME_INITIAL_DEBTS } from "@/app/lib/home-sim"

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatCompactUsd(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return formatUsd(value)
}

export function PortfolioLPCollaterals() {
  const { showDollarAmounts } = useDisplayPreferences()

  const metrics = useMemo(() => {
    const collateral = HOME_COLLATERAL_POOLS.reduce((sum, pool) => sum + pool.collateralUsd, 0)
    const borrowed = HOME_COLLATERAL_POOLS.reduce((sum, pool) => sum + (HOME_INITIAL_DEBTS[pool.id] ?? 0), 0)
    const borrowPower = HOME_COLLATERAL_POOLS.reduce((sum, pool) => sum + pool.borrowPowerUsd, 0)
    const available = Math.max(0, borrowPower - borrowed)
    const hfs = HOME_COLLATERAL_POOLS.map((pool) => {
      const debt = HOME_INITIAL_DEBTS[pool.id] ?? 0
      if (debt <= 0) return null
      return (pool.collateralUsd * (pool.maxLtv / 100)) / debt
    }).filter((value): value is number => value !== null && Number.isFinite(value))
    const averageHf = hfs.length > 0 ? hfs.reduce((sum, value) => sum + value, 0) / hfs.length : null
    return { collateral, borrowed, borrowPower, available, averageHf }
  }, [])

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">My LP Collaterals</h2>
      </div>

      <Card className="border-border bg-surface-raised shadow-elev-1">
        <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Collateral" value={showDollarAmounts ? formatCompactUsd(metrics.collateral) : "••••••••"} />
          <Metric label="Borrow Power" value={showDollarAmounts ? formatCompactUsd(metrics.borrowPower) : "••••••••"} />
          <Metric label="Available" value={showDollarAmounts ? formatCompactUsd(metrics.available) : "••••••••"} />
          <Metric
            label="Avg HF"
            value={showDollarAmounts ? (metrics.averageHf === null ? "—" : metrics.averageHf.toFixed(1)) : "••••••••"}
          />
        </CardContent>
      </Card>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-radius-sm border border-border bg-background/70 p-3.5">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
      <div className="mt-1.5 font-data text-[18px] font-medium tabular-nums text-foreground">{value}</div>
    </div>
  )
}
