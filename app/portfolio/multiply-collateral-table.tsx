"use client"

import * as React from "react"
import Link from "next/link"
import { TokenIcon } from "@/app/components/token-icon"
import type { PortfolioMultiplyCollateral } from "@/app/lib/data/providers/portfolio"
import { Button } from "@/components/ui/button"

function formatUsd(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

export function MultiplyCollateralTable({
  rows,
  onDeleverage,
}: {
  rows: PortfolioMultiplyCollateral[]
  onDeleverage?: (positionId: string) => void
}) {
  if (rows.length === 0) return null

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-medium tracking-tight text-foreground">Multiply positions</h2>
      </div>

      <div className="rounded-[18px] bg-white dark:bg-slate-950">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0 text-[12px] lg:min-w-full">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="rounded-l-2xl bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  #
                </th>
                <th className="bg-slate-50 px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  Market
                </th>
                <th className="bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  Exposure
                </th>
                <th className="bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  Multiplier
                </th>
                <th className="bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  Health
                </th>
                <th className="bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  Equity
                </th>
                <th className="rounded-r-2xl bg-slate-50 px-4 py-3.5 pr-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {rows.map((row, index) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-100 dark:hover:bg-white/5">
                  <td className="py-3 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52">
                    {index + 1}
                  </td>
                  <td className="py-3 pl-6 pr-4">
                    <div className="flex items-center gap-2.5">
                      <TokenIcon symbol={row.collateralToken} size="lg" />
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
                  <td className="px-4 py-3 font-data tabular-nums text-[14px] text-foreground dark:text-white/84">
                    {formatUsd(row.collateralUsd)}
                  </td>
                  <td className="px-4 py-3 font-data tabular-nums text-[14px] text-foreground dark:text-white/84">
                    {row.multiplier.toFixed(2)}x
                  </td>
                  <td className="px-4 py-3 font-data tabular-nums text-[14px] text-emerald-600 dark:text-emerald-400">
                    {row.healthFactor.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-data tabular-nums text-[14px] text-foreground dark:text-white/84">
                    {formatUsd(row.borrowPowerUsd)}
                  </td>
                  <td className="px-4 py-3 pr-6">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="secondary" size="sm" className="h-7 rounded-xs px-2.5 text-[11px]">
                        <Link href={`/multiply/markets/${row.id.split(":")[1] ?? ""}`}>Manage</Link>
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
              className="rounded-2xl border border-border bg-slate-50/80 p-3 dark:border-white/8 dark:bg-slate-900/70"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-data text-[13px] tabular-nums text-muted-foreground dark:text-white/42">{index + 1}</span>
                  <TokenIcon symbol={row.collateralToken} size="lg" />
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">{row.label}</div>
                    <div className="truncate text-[12px] text-muted-foreground dark:text-white/38">
                      {row.multiplier.toFixed(2)}x · HF {row.healthFactor.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-right font-data text-[14px] tabular-nums text-foreground dark:text-white/88">
                  {formatUsd(row.collateralUsd)}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button asChild variant="secondary" size="sm" className="h-7 rounded-xs px-2.5 text-[11px]">
                  <Link href={`/multiply/markets/${row.id.split(":")[1] ?? ""}`}>Manage</Link>
                </Button>
                <Button type="button" size="sm" className="h-7 rounded-xs px-2.5 text-[11px]" onClick={() => onDeleverage?.(row.id)}>
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
