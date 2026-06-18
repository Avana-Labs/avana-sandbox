"use client"

import { TokenIcon } from "@/app/components/token-icon"
import type { PortfolioMultiplyCollateral } from "@/app/lib/data/providers/portfolio"
import { cn } from "@/lib/utils"

function formatUsd(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

export function MultiplyCollateralTable({ rows }: { rows: PortfolioMultiplyCollateral[] }) {
  if (rows.length === 0) return null

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-medium tracking-tight text-foreground">Collateral / Borrowable</h2>
      </div>

      <div className="rounded-[18px] bg-white dark:bg-slate-950">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0 text-[12px] lg:min-w-full">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[28%]" />
              <col className="w-[23%]" />
              <col className="w-[20%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="rounded-l-2xl bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  #
                </th>
                <th className="bg-slate-50 px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground/70 dark:text-white/42">
                    COLLATERAL
                  </span>
                </th>
                <th className="bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground/70 dark:text-white/42">
                    BORROWABLE
                  </span>
                </th>
                <th className="bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground/70 dark:text-white/42">
                    MAX LEVERAGE
                  </span>
                </th>
                <th className="rounded-r-2xl bg-slate-50 px-4 py-3.5 pr-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground/70 dark:text-white/42">
                    AVAILABLE
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <td className="py-3 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52">
                    {index + 1}
                  </td>
                  <td className="py-3 pl-6 pr-4">
                    <div className="flex items-center gap-2.5">
                      <TokenIcon symbol={row.collateralToken} size="lg" />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">
                          {row.collateralToken}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 truncate text-[12px] font-normal tracking-[-0.03em]">
                          <span className="text-muted-foreground dark:text-white/38">Pair</span>
                          <span className="text-foreground dark:text-white/74">{row.label}</span>
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <TokenIcon symbol={row.borrowableToken} size="lg" />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">
                          {row.borrowableToken}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 truncate text-[12px] font-normal tracking-[-0.03em]">
                          <span className="text-muted-foreground dark:text-white/38">Health</span>
                          <span className="font-data tabular-nums text-emerald-600 dark:text-emerald-400">
                            {row.healthFactor.toFixed(2)}x
                          </span>
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">
                      <span className="block text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                        {row.multiplier.toFixed(2)}x
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[12px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38",
                        )}
                      >
                        {row.protocol}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 pr-6">
                    <span className="inline-flex items-center text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                      {formatUsd(row.borrowPowerUsd)}
                    </span>
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
                  <span className="font-data text-[13px] tabular-nums text-muted-foreground dark:text-white/42">
                    {index + 1}
                  </span>
                  <TokenIcon symbol={row.collateralToken} size="lg" />
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">
                      {row.collateralToken}
                    </div>
                    <div className="truncate text-[12px] text-muted-foreground dark:text-white/38">{row.label}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-data text-[14px] tabular-nums text-foreground dark:text-white/88">
                    {formatUsd(row.borrowPowerUsd)}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground dark:text-white/38">
                    Available
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-left">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground dark:text-white/38">
                    Borrowable
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[13px] text-foreground dark:text-white/84">
                    <TokenIcon symbol={row.borrowableToken} size="sm" />
                    <span>{row.borrowableToken}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground dark:text-white/38">
                    Max Leverage
                  </div>
                  <div className="mt-1 font-data text-[13px] tabular-nums text-foreground dark:text-white/84">
                    {row.multiplier.toFixed(2)}x
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground dark:text-white/38">
                    Health
                  </div>
                  <div className="mt-1 font-data text-[13px] tabular-nums text-emerald-600 dark:text-emerald-400">
                    {row.healthFactor.toFixed(2)}x
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
