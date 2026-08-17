"use client"

import { useMemo } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { formatCompactUsd, formatUsdExact } from "@/app/lib/borrow-sim"
import { TokenIcon } from "@/app/components/token-icon"
import { DesktopTableSurface, SilentActionHeader } from "@/app/components/market-table-primitives"
import type { ExposureInputs, SymbolExposure } from "@/app/lib/portfolio/exposure-aggregator"
import { aggregateSymbolExposure } from "@/app/lib/portfolio/exposure-aggregator"

const MASK = "••••"

function summariseSources(entry: SymbolExposure, t: (key: string) => string): string {
  const counts = new Map<string, number>()
  for (const leg of entry.legs) counts.set(leg.source, (counts.get(leg.source) ?? 0) + 1)
  return [...counts.entries()]
    .map(([source, count]) => {
      switch (source) {
        case "lend":
          return `${t("Lend")}${count > 1 ? ` ×${count}` : ""}`
        case "borrow-collateral":
          return `${t("Borrow collateral")}${count > 1 ? ` ×${count}` : ""}`
        case "borrow-debt":
          return `${t("Borrow debt")}${count > 1 ? ` ×${count}` : ""}`
        case "multiply-collateral":
          return `${t("Multiply collateral")}${count > 1 ? ` ×${count}` : ""}`
        case "multiply-debt":
          return `${t("Multiply debt")}${count > 1 ? ` ×${count}` : ""}`
        case "umbrella":
          return `${t("Umbrella")}${count > 1 ? ` ×${count}` : ""}`
      }
    })
    .join(" · ")
}

/**
 * Wave-4 C: cross-product exposure roll-up. The dashboard headlines net-of-debt
 * USD per product silo; this component crosses the silo boundary and tells the
 * user how much of each token they hold overall, splitting borrow LP-pair
 * collateral 50/50 across its two legs (the read-model only carries a single
 * lpTokenPriceUsd6 per LP, so 50/50 is the best signal without an on-chain
 * reserve oracle — see the aggregator's splitPairUsd note).
 */
export function PortfolioExposureBySymbol({ inputs }: { inputs: ExposureInputs }) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const rows = useMemo(() => aggregateSymbolExposure(inputs), [inputs])
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  if (rows.length === 0) return null

  return (
    <section
      aria-labelledby="dashboard-exposure-by-asset-heading"
      className="rounded-radius-md border border-border bg-background/40 p-4 md:p-5"
    >
      <div className="mb-3 flex flex-col gap-1">
        <h3
          id="dashboard-exposure-by-asset-heading"
          className="text-[16px] font-medium tracking-tight text-foreground md:text-[17px]"
        >
          {t("Your exposure by asset")}
        </h3>
        <p className="text-[13px] text-muted-foreground">
          {t("Long, short, and net USD per token across every product.")}
        </p>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <DesktopTableSurface className="!rounded-none">
          <table className="w-full min-w-[520px] table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Asset")}
                </th>
                <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Long")}
                </th>
                <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Short")}
                </th>
                <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Net")}
                </th>
                <SilentActionHeader className="!rounded-none pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {rows.map((row) => {
                const netClass = row.netUsd > 0 ? "text-success" : row.netUsd < 0 ? "text-danger" : "text-foreground"
                return (
                  <tr key={row.symbol} className="text-[14px]">
                    <td className="py-3.5 pl-4">
                      <div className="flex items-center gap-2.5">
                        <TokenIcon symbol={row.symbol} size="table" />
                        <span className="font-medium tracking-[-0.03em] text-foreground dark:text-white">
                          {row.symbol}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-right font-data tabular-nums text-foreground">
                      {m(formatCompactUsd(row.longUsd))}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-data tabular-nums text-foreground">
                      {row.shortUsd > 0 ? m(formatCompactUsd(row.shortUsd)) : "—"}
                    </td>
                    <td className={`py-3.5 pr-4 text-right font-data tabular-nums ${netClass}`}>
                      {m(formatUsdExact(row.netUsd))}
                    </td>
                    <td className="py-3.5 pr-4 text-right text-[12px] text-muted-foreground">
                      {summariseSources(row, t)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DesktopTableSurface>
      </div>

      <div className="space-y-2 md:hidden">
        {rows.map((row) => {
          const netClass = row.netUsd > 0 ? "text-success" : row.netUsd < 0 ? "text-danger" : "text-foreground"
          return (
            <div key={row.symbol} className="rounded-radius-sm border border-border bg-background px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TokenIcon symbol={row.symbol} size="table" />
                  <span className="text-[14px] font-medium text-foreground">{row.symbol}</span>
                </div>
                <span className={`font-data text-[14px] font-medium tabular-nums ${netClass}`}>
                  {m(formatUsdExact(row.netUsd))}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[12px] text-muted-foreground">
                <span>
                  {t("Long")}: {m(formatCompactUsd(row.longUsd))}
                </span>
                <span>
                  {t("Short")}: {row.shortUsd > 0 ? m(formatCompactUsd(row.shortUsd)) : "—"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{summariseSources(row, t)}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
