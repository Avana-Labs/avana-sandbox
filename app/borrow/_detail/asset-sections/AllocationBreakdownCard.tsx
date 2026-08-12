"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { TokenBubble } from "@/app/borrow/components/atoms"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { DesktopTableSurface } from "@/app/components/market-table-primitives"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { formatCompactUsd, utilizationToneClass } from "@/app/lib/borrow-sim"
import { borrowMarketDetailPath } from "@/app/lib/borrow-routes"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"
import { cn } from "@/lib/utils"

type Props = { detail: AssetDetail; id?: string }
type SortKey = "pool" | "share" | "value"

function SortIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 16"
      fill="none"
      className="size-[14px] text-muted-foreground/70 dark:text-white/60"
    >
      <path d="M4 5 6 3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 11 6 13l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function headerButtonClass(active: boolean) {
  return cn(
    "flex items-center gap-2 transition-colors",
    active ? "text-foreground dark:text-white" : "text-muted-foreground/70 dark:text-white/42",
  )
}

function headerCellClass(extra?: string) {
  return cn(
    "bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58",
    extra,
  )
}

function marketHrefForAllocationRow(assetId: string, rowId: string) {
  const prefix = `${assetId}-`
  return rowId.startsWith(prefix) ? borrowMarketDetailPath(rowId.slice(prefix.length)) : borrowMarketDetailPath(rowId)
}

export function AllocationBreakdownCard({ detail, id }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>("share")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const helpText = t("Where {symbol} is deployed across LP collateral pools.").replace("{symbol}", detail.hero.symbol)

  const rows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1
    return [...detail.allocation].sort((a, b) => {
      switch (sortKey) {
        case "share":
          return (a.sharePct - b.sharePct) * direction
        case "value":
          return (a.valueUsd - b.valueUsd) * direction
        case "pool":
        default:
          return a.poolName.localeCompare(b.poolName) * direction
      }
    })
  }, [detail.allocation, sortDirection, sortKey])

  const toggleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(nextKey)
    setSortDirection(nextKey === "pool" ? "asc" : "desc")
  }

  return (
    <section id={id} aria-label={t("Allocation breakdown")} className="space-y-5">
      <div className="flex items-center gap-1.5">
        <h2 className="text-[22px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[24px]">
          {t("Allocation breakdown")}
        </h2>
        <ActionMetricHelp text={helpText} topic="Allocation breakdown" />
      </div>

      {rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground dark:text-white/44">
          {t("No pools currently expose {symbol} as a borrow asset.").replace("{symbol}", detail.hero.symbol)}
        </p>
      ) : (
        <DesktopTableSurface className="!rounded-none">
          <div className="overflow-x-auto md:overflow-x-visible">
            <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-[12px] md:min-w-0">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[44%]" />
                <col className="w-[24%]" />
                <col className="w-[24%]" />
              </colgroup>
              <thead>
                <tr className="bg-table-header text-left text-muted-foreground">
                  <th className={headerCellClass("pl-4 pr-2 sm:pl-6")}>#</th>
                  <th className={headerCellClass("px-2 sm:px-4")}>
                    <button
                      type="button"
                      onClick={() => toggleSort("pool")}
                      className={headerButtonClass(sortKey === "pool")}
                    >
                      <span>{t("ASSET")}</span>
                      <SortIcon />
                    </button>
                  </th>
                  <th className={headerCellClass("px-2 sm:px-4")}>
                    <button
                      type="button"
                      onClick={() => toggleSort("share")}
                      className={headerButtonClass(sortKey === "share")}
                    >
                      <span>{t("SHARE")}</span>
                      <SortIcon />
                    </button>
                  </th>
                  <th className={headerCellClass("pl-2 pr-4 sm:pr-6")}>
                    <button
                      type="button"
                      onClick={() => toggleSort("value")}
                      className={headerButtonClass(sortKey === "value")}
                    >
                      <span>{t("VALUE")}</span>
                      <SortIcon />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-white/6">
                {rows.map((row, index) => {
                  const href = marketHrefForAllocationRow(detail.row.id, row.id)
                  return (
                    <tr
                      key={row.id}
                      className="asset-swap group cursor-pointer transition-colors"
                      onClick={() => router.push(href)}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <td
                        className={`py-2.5 pl-4 pr-2 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 sm:pl-6 ${TABLE_ROW_HOVER_LEFT}`}
                      >
                        {index + 1}
                      </td>
                      <td className={`min-w-0 py-2.5 px-2 sm:px-4 ${TABLE_ROW_HOVER_BG}`}>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex shrink-0 items-center">
                            <span className="relative z-[1]">
                              <TokenBubble
                                visual={row.visuals[0]}
                                size="table"
                                ring={false}
                                className="bg-transparent"
                              />
                            </span>
                            <span className="-ml-3">
                              <TokenBubble
                                visual={row.visuals[1]}
                                size="table"
                                ring={false}
                                className="bg-transparent"
                              />
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                              {row.poolName}
                            </div>
                            <div
                              className={cn(
                                "mt-1 truncate text-[13px] font-normal tracking-[-0.03em] tabular-nums",
                                utilizationToneClass(row.utilizationPct),
                              )}
                            >
                              {row.utilizationPct.toFixed(2)}% {t("Utilization")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`py-2.5 px-2 sm:px-4 ${TABLE_ROW_HOVER_BG}`}>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="hidden h-1 w-10 shrink-0 overflow-hidden rounded-xs bg-surface-inset sm:block lg:w-14">
                            <span
                              className="block h-full rounded-xs bg-accent-primary"
                              style={{ width: `${Math.min(100, row.sharePct)}%` }}
                            />
                          </span>
                          <span className="font-data text-[15px] font-normal tracking-[-0.03em] tabular-nums text-foreground dark:text-white">
                            {row.sharePct.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td
                        className={`py-2.5 pl-2 pr-4 font-data text-[15px] font-normal tracking-[-0.03em] tabular-nums text-foreground dark:text-white sm:pr-6 ${TABLE_ROW_HOVER_RIGHT}`}
                      >
                        {formatCompactUsd(row.valueUsd)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DesktopTableSurface>
      )}
    </section>
  )
}
