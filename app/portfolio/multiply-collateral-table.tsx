"use client"

import * as React from "react"
import Link from "next/link"
import { TokenIcon } from "@/app/components/token-icon"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import type { PortfolioMultiplyCollateral } from "@/app/lib/data/providers/portfolio"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"

const MASK = "••••"

function formatPct(value: number) {
  return `${value.toFixed(2)}%`
}

function formatHealthFactor(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "∞"
}

function statusClass(status: PortfolioMultiplyCollateral["status"]) {
  return status === "open"
    ? "border-emerald-500/20 bg-emerald-500/10 text-success"
    : "border-slate-500/20 bg-muted0/10 text-slate-600 dark:text-slate-300"
}

export function MultiplyCollateralTable({
  rows,
  onDeleverage,
}: {
  rows: PortfolioMultiplyCollateral[]
  onDeleverage?: (positionId: string) => void
}) {
  const { showDollarAmounts } = useDisplayPreferences()
  const usd = (value: number) => (showDollarAmounts ? formatCompactUsd(value) : MASK)

  if (rows.length === 0) return null

  return (
    <section>
      <div className="rounded-radius-md bg-transparent dark:bg-transparent">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1180px] table-fixed border-separate border-spacing-0 text-[12px] lg:min-w-full">
            <colgroup>
              <col className="w-[3%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="rounded-l-radius-lg bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  #
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Market
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Exposure
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Multiplier
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Debt
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  LTV
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Health
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Liq. price
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Net APY
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Status
                </th>
                <SilentActionHeader className="pr-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {rows.map((row, index) => (
                <tr key={row.id} className="group transition-colors">
                  <td className={`py-3 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}>
                    {index + 1}
                  </td>
                  <td className={`py-3 pl-4 pr-4 ${TABLE_ROW_HOVER_BG}`}>
                    <div className="flex items-center gap-2.5">
                      <TokenIcon symbol={row.collateralToken} size="table" />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">
                          {row.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground dark:text-white/38">
                          {row.collateralToken} / {row.borrowableToken}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 font-data tabular-nums text-[14px] text-foreground dark:text-white/84 ${TABLE_ROW_HOVER_BG}`}>
                    {usd(row.collateralUsd)}
                  </td>
                  <td className={`px-4 py-3 font-data tabular-nums text-[14px] text-foreground dark:text-white/84 ${TABLE_ROW_HOVER_BG}`}>
                    {row.multiplier.toFixed(2)}x
                  </td>
                  <td className={`px-4 py-3 font-data tabular-nums text-[14px] text-foreground dark:text-white/84 ${TABLE_ROW_HOVER_BG}`}>
                    {usd(row.debtUsd)}
                  </td>
                  <td className={`px-4 py-3 font-data tabular-nums text-[14px] text-foreground dark:text-white/84 ${TABLE_ROW_HOVER_BG}`}>
                    {formatPct(row.ltvPct)}
                  </td>
                  <td className={`px-4 py-3 font-data tabular-nums text-[14px] text-success ${TABLE_ROW_HOVER_BG}`}>
                    {formatHealthFactor(row.healthFactor)}
                  </td>
                  <td className={`px-4 py-3 font-data tabular-nums text-[14px] text-foreground dark:text-white/84 ${TABLE_ROW_HOVER_BG}`}>
                    {row.liquidationPriceUsd ? usd(row.liquidationPriceUsd) : "—"}
                  </td>
                  <td className={`px-4 py-3 font-data tabular-nums text-[14px] text-foreground dark:text-white/84 ${TABLE_ROW_HOVER_BG}`}>
                    {formatPct(row.netApyPct)}
                  </td>
                  <td className={`px-4 py-3 ${TABLE_ROW_HOVER_BG}`}>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize",
                        statusClass(row.status),
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 pr-6 ${TABLE_ROW_HOVER_RIGHT}`}>
                    <HoverActionGroup className="gap-2">
                      <Button asChild variant="secondary" size="sm" className="h-7 rounded-xs px-2.5 text-[11px]">
                        <Link href={`/multiply/markets/${row.marketId}`}>Manage</Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 rounded-xs px-2.5 text-[11px]"
                        onClick={() => onDeleverage?.(row.id)}
                      >
                        Deleverage
                      </Button>
                    </HoverActionGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 px-3 py-3 md:hidden">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="rounded-radius-lg border border-border bg-muted/80 p-3 dark:border-white/8 dark:bg-slate-900/70"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-data text-[13px] tabular-nums text-muted-foreground dark:text-white/42">
                    {index + 1}
                  </span>
                  <TokenIcon symbol={row.collateralToken} size="table" />
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">
                      {row.label}
                    </div>
                    <div className="truncate text-[12px] text-muted-foreground dark:text-white/38">
                      {row.multiplier.toFixed(2)}x · LTV {formatPct(row.ltvPct)} · HF{" "}
                      {formatHealthFactor(row.healthFactor)}
                    </div>
                  </div>
                </div>
                <div className="text-right font-data text-[14px] tabular-nums text-foreground dark:text-white/88">
                  {usd(row.collateralUsd)}
                </div>
              </div>
              <dl className="mb-3 grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <dt className="text-muted-foreground">Debt</dt>
                  <dd className="font-data tabular-nums">{usd(row.debtUsd)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Net APY</dt>
                  <dd className="font-data tabular-nums">{formatPct(row.netApyPct)}</dd>
                </div>
              </dl>
              <div className="flex justify-end gap-2">
                <Button asChild variant="secondary" size="sm" className="h-7 rounded-xs px-2.5 text-[11px]">
                  <Link href={`/multiply/markets/${row.marketId}`}>Manage</Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 rounded-xs px-2.5 text-[11px]"
                  onClick={() => onDeleverage?.(row.id)}
                >
                  Deleverage
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
