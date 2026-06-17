"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PillTabButton } from "@/components/ui/pill-tab-button"
import { TokenIcon } from "@/app/components/token-icon"
import { DeltaPill, FlashValue } from "@/app/components/ui/live"
import type { PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"

const TABS = ["LP Collaterals", "Positions", "Open Orders", "TWAP", "History"] as const
type Tab = (typeof TABS)[number]
type PortfolioPositionsTabsProps = {
  allowedTabs?: Tab[]
  initialTab?: Tab
  data: PortfolioMultiplyTabData
}

function PositionRow({
  symbol,
  label,
  side,
  leverage,
  pnlUsd,
  pnlPct,
}: {
  symbol: string
  label: string
  side: "long" | "short"
  leverage: number
  pnlUsd: number
  pnlPct: number
}) {
  const isLong = side === "long"
  const sideTint = isLong ? "bg-emerald-500" : "bg-rose-500"
  const sidePillClass = isLong
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400"
  const pnlClass = pnlUsd >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
  const pnlPrefix = pnlUsd >= 0 ? "+" : "−"
  const absPnl = Math.abs(pnlUsd).toFixed(2)

  return (
    <div className="relative flex items-center justify-between gap-3 rounded-radius-sm border border-border bg-surface-inset px-3 py-2 pl-3.5 transition-colors hover:bg-surface-raised/60">
      <span className={`absolute inset-y-1.5 left-0 w-[2px] rounded-xs ${sideTint}`} aria-hidden />
      <div className="flex items-center gap-2.5">
        <TokenIcon symbol={symbol} size="md" />
        <span className="font-medium text-[13px] text-foreground">{label}</span>
        <span className={`rounded-xs border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] ${sidePillClass}`}>
          {isLong ? "Long" : "Short"} {leverage}x
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <FlashValue value={pnlUsd} goodDirection="up" className={`text-[13px] font-data font-medium tabular-nums ${pnlClass}`}>
          {`${pnlPrefix}$${absPnl}`}
        </FlashValue>
        <DeltaPill value={pnlPct} format="percent" digits={2} goodDirection="up" />
      </div>
    </div>
  )
}

function formatRelativeTime(iso: string) {
  const elapsedMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000))
  if (totalSeconds < 60) return `${totalSeconds}s`
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return `${totalHours}h`
  return `${Math.floor(totalHours / 24)}d`
}

export function PortfolioPositionsTabs({ allowedTabs = [...TABS], initialTab = "Positions", data }: PortfolioPositionsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-[14px] font-medium tracking-tight text-foreground">My positions</h2>
      </div>
      <Card className="border-border bg-surface-raised shadow-elev-1">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-scrollbar flex space-x-4 overflow-x-auto">
            {allowedTabs.map((tab) => (
              <PillTabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                {tab}
              </PillTabButton>
            ))}
          </div>
        </div>
        <CardContent className="p-5">
          {activeTab === "Open Orders" ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              {data.openOrders.length ? (
                <div className="w-full space-y-2">
                  {data.openOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-radius-sm border border-border bg-surface-inset px-3.5 py-2.5">
                      <div className="text-left">
                        <p className="font-medium text-[13px] text-foreground">{order.label}</p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">{order.venue}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-data text-[13px] font-medium tabular-nums text-foreground">${order.sizeUsd.toLocaleString()}</p>
                        <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-[13px]">No open orders</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground/60">Orders will appear here once submitted.</p>
                </>
              )}
            </div>
          ) : activeTab === "Positions" ? (
            <div className="space-y-2">
              {data.positions.map((position) => (
                <PositionRow
                  key={position.id}
                  symbol={position.symbol}
                  label={position.label}
                  side={position.side}
                  leverage={position.leverage}
                  pnlUsd={position.pnlUsd}
                  pnlPct={position.pnlPct}
                />
              ))}
            </div>
          ) : activeTab === "LP Collaterals" ? (
            <div className="divide-y divide-border rounded-radius-sm border border-border bg-surface-inset">
              {data.lpCollaterals.map((collateral) => (
                <div key={collateral.id} className="flex items-center justify-between px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center">
                      <TokenIcon symbol={collateral.tokens[0]} size="md" ring />
                      <TokenIcon symbol={collateral.tokens[1]} size="md" ring className="-ml-2" />
                    </div>
                    <div>
                      <p className="font-medium text-[13px] text-foreground">
                        {collateral.label} ({collateral.protocol})
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">Health: {collateral.healthFactor.toFixed(2)}x</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-[13px] font-medium tabular-nums text-foreground">
                      ${collateral.collateralUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Deposited</p>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "TWAP" ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              {data.twapOrders.length ? (
                <div className="w-full space-y-2">
                  {data.twapOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-radius-sm border border-border bg-surface-inset px-3.5 py-2.5">
                      <div className="text-left">
                        <p className="font-medium text-[13px] text-foreground">{order.label}</p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">{order.interval} interval</p>
                      </div>
                      <div className="text-right">
                        <p className="font-data text-[13px] font-medium tabular-nums text-foreground">${order.amountUsd.toLocaleString()}</p>
                        <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-[13px]">No active TWAP orders</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground/60">Time-weighted average price orders appear here.</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto md:overflow-visible">
              <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
                <colgroup>
                  <col className="w-[88px]" />
                  <col className="w-[150px]" />
                  <col className="w-[130px]" />
                  <col className="w-[260px]" />
                  <col className="w-[120px]" />
                  <col className="w-[120px]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                    <th className="rounded-l-2xl bg-slate-50 px-4 py-3.5 dark:bg-slate-900/90">Time</th>
                    <th className="bg-slate-50 px-4 py-3.5 dark:bg-slate-900/90">Type</th>
                    <th className="bg-slate-50 px-4 py-3.5 dark:bg-slate-900/90">Amount</th>
                    <th className="bg-slate-50 px-4 py-3.5 dark:bg-slate-900/90">Position</th>
                    <th className="bg-slate-50 px-4 py-3.5 dark:bg-slate-900/90">Status</th>
                    <th className="rounded-r-2xl bg-slate-50 px-4 py-3.5 text-right dark:bg-slate-900/90">Txn</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/70">
                      <td className="px-4 py-4 font-data text-[13px] tabular-nums text-foreground">{formatRelativeTime(row.at)}</td>
                      <td className="px-4 py-4 text-[13px] font-medium text-foreground">{row.kind}</td>
                      <td className="px-4 py-4 font-data text-[13px] tabular-nums text-foreground">{row.amountLabel}</td>
                      <td className="px-4 py-4">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-foreground">{row.primaryLabel}</div>
                          <div className="truncate text-[11.5px] text-muted-foreground">{row.secondaryLabel}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          {row.status[0].toUpperCase() + row.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <a href={row.txHref} target="_blank" rel="noreferrer" className="font-data text-[12px] tabular-nums text-foreground underline-offset-2 hover:underline">
                          {row.txHashShort}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
