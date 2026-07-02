"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import {
  BORROW_SUPPLY_META,
  HOME_COLLATERAL_POOLS,
  formatCompactUsd,
  formatHealthFactor,
  formatUsdExact,
  getSpokeById,
  healthFactorToneClass,
  homePoolSpoke,
  homeVisualToBorrowVisual,
} from "@/app/lib/data/borrow-domain"
import type { SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import {
  HF_ZONES,
  activeHealthFactorZoneIndex,
  healthFactorBarTone,
  healthFactorStatusLabel,
} from "@/app/lib/action-system/health-factor-ui"
import { HfNumber, PillButton, TokenBubble, TokenPairCell } from "@/app/borrow/components/atoms"
import { HealthFactorPositionBar } from "@/app/components/action-page/action-health-factor-bar"
import { HoverActionGroup } from "@/app/components/market-table-primitives"
import { formatApy } from "@/app/lib/format"
import { cn } from "@/lib/utils"

import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"

type SuppliesTableProps = {
  rows: SupplyRowContext[]
  totals: { collateral: number; borrowed: number; available: number; fees: number; averageHf: number | null }
  onBorrowMore: (context: SupplyRowContext) => void
  onAddCollateral: (context: SupplyRowContext) => void
  onRemove: (context: SupplyRowContext) => void
  showBalance?: boolean
  showSummary?: boolean
  showHeading?: boolean
}

const MASK = "••••"

export function SuppliesPanel({
  rows,
  totals,
  onBorrowMore,
  onAddCollateral,
  onRemove,
  showBalance = true,
  showSummary = true,
  showHeading = true,
}: SuppliesTableProps) {
  const m = (value: string) => (showBalance ? value : MASK)
  if (rows.length === 0) {
    return (
      <div className="rounded-radius-md border border-dashed border-border bg-surface-raised/50 px-6 py-10 text-center text-[13px] text-muted-foreground">
        <div className="text-[20px] font-medium leading-snug tracking-tight text-brand">
          Nothing supplied yet
        </div>
        <div className="mt-1 text-[15px] leading-snug">To borrow you need to supply any LPs to be used as collateral</div>
      </div>
    )
  }
  return (
    <section className="mb-2">
      {showSummary ? <SuppliesHealthFactorCard averageHealthFactor={totals.averageHf} showBalance={showBalance} /> : null}
      {showHeading ? (
        <div className="mb-3">
          <h3 className="text-[14px] font-medium tracking-tight">My LP Collaterals</h3>
        </div>
      ) : null}
      <div className="hidden md:block">
        <div className="rounded-radius-lg bg-transparent">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[26%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                  <th className="rounded-l-radius-lg bg-table-header px-4 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    #
                  </th>
                  <th className="bg-table-header px-5 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    LP Position
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-left text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Collateral
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-left text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Scope Max Borrow
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-left text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Scope Health Factor
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-left text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Fees Earned
                  </th>
                  <th className="rounded-r-radius-lg bg-table-header px-5 py-3.5 pr-6 text-right text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
              {rows.map((row, index) => {
                const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
                const meta = BORROW_SUPPLY_META[row.pool.id]
                const hfTone = healthFactorToneClass(row.healthFactor)
                return (
                  <tr key={row.pool.id} className="group cursor-pointer transition-colors">
                    <td className={`py-3 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}>
                      {index + 1}
                    </td>
                    <td className={`py-3 pl-5 ${TABLE_ROW_HOVER_BG}`}>
                      <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} size="md" />
                    </td>
                    <td className={`py-3 pl-4 text-left font-data text-[13px] tabular-nums text-foreground ${TABLE_ROW_HOVER_BG}`}>
                      {m(formatCompactUsd(row.pool.collateralUsd))}
                    </td>
                    <td className={`py-3 pl-4 text-left font-data text-[13px] tabular-nums text-foreground ${TABLE_ROW_HOVER_BG}`}>
                      {m(formatCompactUsd(row.remainingBorrowPowerUsd))}
                    </td>
                    <td className={`py-3 text-right ${TABLE_ROW_HOVER_BG}`}>
                      <HfNumber value={m(formatHealthFactor(row.healthFactor))} tone={hfTone} />
                    </td>
                    <td className={`py-3 pl-4 text-left ${TABLE_ROW_HOVER_BG}`}>
                      <div className="font-data text-[13px] tabular-nums text-foreground">{m(row.feesLabel)}</div>
                      <div className="font-data text-[11px] font-medium tabular-nums text-success">
                        {formatApy(row.pairApr)} APR
                      </div>
                    </td>
                    <td className={`py-3 pl-4 pr-6 text-left ${TABLE_ROW_HOVER_RIGHT}`}>
                      <HoverActionGroup align="start">
                        <PillButton variant="ghost" onClick={() => onRemove(row)}>
                          Remove
                        </PillButton>
                        <PillButton variant="primary" onClick={() => onBorrowMore(row)}>
                          Borrow
                        </PillButton>
                      </HoverActionGroup>
                    </td>
                  </tr>
                )
              })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ul className="space-y-5 md:hidden">
        {rows.map((row) => {
          const spoke = getSpokeById(homePoolSpoke(row.pool.category))
          const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
          const hf = row.healthFactor
          // Single-source the label through formatHealthFactor so the mobile card
          // caps/formats health identically to the desktop table and the hero card.
          const hfLabel = formatHealthFactor(hf)
          const hfTone = healthFactorBarTone(hf)
          const spokeShort = spoke.label.replace(" Spoke", "")
          const spokePillLabel = `${spokeShort} · Uni v3`
          return (
            <li key={row.pool.id} className="space-y-3 rounded-radius-md border border-border bg-card px-4 py-4 shadow-elev-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center">
                    <TokenBubble visual={visuals[0]} size="table" />
                    <TokenBubble visual={visuals[1]} size="table" className="-ml-2" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-foreground">{row.pool.name}</div>
                    <span
                      className={cn(
                        "mt-1 inline-flex items-center rounded-xs px-1.5 py-0.5 text-[11px] font-medium",
                        spoke.pillBgClass,
                        spoke.pillTextClass,
                      )}
                    >
                      {spokePillLabel}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-data text-[17px] font-medium tabular-nums text-foreground">
                    {m(formatUsdExact(row.pool.collateralUsd))}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Collateral</div>
                </div>
              </div>

              <div className="space-y-2.5 rounded-radius-sm border border-border bg-surface-inset px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-foreground">Scope Health Factor</span>
                  <span className={cn("font-data text-[22px] font-medium leading-none tabular-nums", hfTone.text)}>{m(hfLabel)}</span>
                </div>
                <HealthFactorPositionBar
                  value={hf}
                  heightClassName="h-1.5"
                  trackClassName="bg-surface-raised"
                  className="mt-0"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Safe</span>
                  <span>Caution</span>
                  <span>Liquidation</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-[12.5px]">
                  <span className="text-muted-foreground">Liquidation at</span>
                  <span className={cn("font-data font-medium tabular-nums", hfTone.text)}>
                    {m(formatUsdExact(row.liquidationThresholdUsd))} collateral
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-radius-sm border border-border bg-surface-inset">
                <SupplyStatCell
                  value={m(formatUsdExact(row.borrowedUsd))}
                  label="Borrowed"
                  valueTone="text-rose-500"
                />
                <SupplyStatCell
                  value={m(row.feesLabel)}
                  label="Fees Earned"
                  valueTone="text-success"
                />
                <SupplyStatCell
                  value={formatApy(row.pairApr)}
                  label="LP APR"
                />
              </div>

              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => onRemove(row)}
                  className="flex-1 rounded-radius-sm border border-border bg-surface-raised px-4 py-2.5 text-center text-[13px] font-medium text-foreground transition-colors hover:bg-surface-inset"
                >
                  Remove LP
                </button>
                <button
                  type="button"
                  onClick={() => onAddCollateral(row)}
                  className="flex-[2] rounded-radius-sm bg-accent-primary px-4 py-2.5 text-center text-[13px] font-medium text-accent-primary-foreground shadow-elev-1 transition-colors hover:bg-accent-primary-hover"
                >
                  Add Collateral
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function SupplyStatCell({ value, label, valueTone }: { value: string; label: string; valueTone?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-2.5">
      <span className={cn("font-data text-[14px] font-medium tabular-nums text-foreground", valueTone)}>{value}</span>
      <span className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
    </div>
  )
}


export function SuppliesHealthFactorCard({
  averageHealthFactor,
  showBalance,
}: {
  averageHealthFactor: number | null
  showBalance: boolean
}) {
  const status = healthFactorStatusLabel(averageHealthFactor)
  const hfLabel = formatHealthFactor(averageHealthFactor)
  const masked = !showBalance
  const activeZoneIdx = activeHealthFactorZoneIndex(averageHealthFactor)

  return (
    <div className="mb-4 rounded-radius-md border border-border bg-background px-5 py-4 shadow-elev-1 md:px-6 md:py-5">
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-data text-[20px] font-bold leading-none tracking-tight text-foreground">
            {masked ? "••" : hfLabel}
          </span>
          <span className="text-[13px] font-semibold text-foreground">Credit Health</span>
          <ActionMetricHelp
            topic="Credit Health"
            text="Wallet-wide health factor from total liquidation value divided by total borrowed. Above 1.5 is generally healthy."
          />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-table-header px-2.5 py-0.5 text-[10px] font-bold tracking-wide",
            status.tone === "positive" && "text-success",
            status.tone === "warning" && "text-amber-600",
            status.tone === "danger" && "text-rose-600",
            status.tone === "default" && "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              status.tone === "positive" && "bg-emerald-500",
              status.tone === "warning" && "bg-amber-500",
              status.tone === "danger" && "bg-rose-500",
              status.tone === "default" && "bg-muted-foreground",
            )}
          />
          {masked ? "••" : status.label}
        </span>
      </div>

      <div className="mt-9">
        <HealthFactorPositionBar value={averageHealthFactor} heightClassName="h-2.5" />

        <div className="mt-4 flex h-4 items-center justify-between text-[11px] font-medium text-muted-foreground">
          {HF_ZONES.map((zone, index) => {
            const isActive = index === activeZoneIdx
            return (
              <span key={zone.id} className={cn("inline-flex items-center gap-1.5", isActive && "text-foreground")}>
                <span className={cn("size-1.5 rounded-full", isActive ? zone.color : "bg-muted-foreground/40")} />
                {zone.label}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { HOME_COLLATERAL_POOLS }
