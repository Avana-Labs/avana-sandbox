"use client"

import { useRouter } from "next/navigation"
import { TokenIcon } from "@/app/components/token-icon"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import type { PortfolioMultiplyCollateral } from "@/app/lib/data/providers/portfolio"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { Button } from "@/components/ui/button"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"

const MASK = "••••"

function formatPct(value: number) {
  return `${value.toFixed(2)}%`
}

function formatHealthFactor(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "∞"
}

export function MultiplyCollateralTable({
  rows,
  onDeleverage,
}: {
  rows: PortfolioMultiplyCollateral[]
  onDeleverage?: (positionId: string) => void
}) {
  const router = useRouter()
  const { showDollarAmounts } = useDisplayPreferences()
  const usd = (value: number) => (showDollarAmounts ? formatCompactUsd(value) : MASK)

  if (rows.length === 0) return null

  return (
    <section>
      <div className="rounded-radius-md bg-transparent dark:bg-transparent">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0 text-[12px] lg:min-w-full">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="rounded-l-radius-lg bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
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
                  Health
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Net APY
                </th>
                <SilentActionHeader className="pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="group cursor-pointer transition-colors"
                  onClick={() => router.push(`/multiply/markets/${row.marketId}`)}
                >
                  <td className={`py-3 pl-4 pr-4 ${TABLE_ROW_HOVER_LEFT}`}>
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
                  <td className={`px-4 py-3 font-data tabular-nums text-[14px] text-success ${TABLE_ROW_HOVER_BG}`}>
                    {formatHealthFactor(row.healthFactor)}
                  </td>
                  <td className={`px-4 py-3 font-data tabular-nums text-[14px] text-foreground dark:text-white/84 ${TABLE_ROW_HOVER_BG}`}>
                    {formatPct(row.netApyPct)}
                  </td>
                  <td className={`px-4 py-3 pr-5 ${TABLE_ROW_HOVER_RIGHT}`}>
                    <HoverActionGroup className="gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="brand-secondary"
                        className="h-7 rounded-xs px-2.5 text-[11px]"
                        onClick={(event) => {
                          event.stopPropagation()
                          router.push(actionPagePath("multiply", "multiply", { market: row.marketId, return: `/multiply/markets/${row.marketId}` }))
                        }}
                      >
                        Multiply
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="brand"
                        className="h-7 rounded-xs px-2.5 text-[11px]"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDeleverage?.(row.id)
                        }}
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
            <MarketMobileCard
              key={row.id}
              clickable
              className="space-y-3"
              onClick={() => router.push(`/multiply/markets/${row.marketId}`)}
            >
              <MarketMobileCardHeader
                identity={
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="font-data text-[13px] tabular-nums text-muted-foreground dark:text-white/42">
                      {index + 1}
                    </span>
                    <TokenIcon symbol={row.collateralToken} size="table" />
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">
                        {row.label}
                      </div>
                      <div className="truncate text-[12px] text-muted-foreground dark:text-white/38">
                        {row.protocol}
                      </div>
                    </div>
                  </div>
                }
                metric={
                  <MarketMobileMetric
                    value={`${row.multiplier.toFixed(2)}x`}
                    label="Multiplier"
                    valueClassName="text-foreground dark:text-white/88"
                  />
                }
              />

              <MarketMobileStatList>
                <MarketMobileStatRow
                  label="Exposure"
                  value={usd(row.collateralUsd)}
                />
                <MarketMobileStatRow
                  label="Debt"
                  value={usd(row.debtUsd)}
                />
                <MarketMobileStatRow
                  label="Health"
                  value={formatHealthFactor(row.healthFactor)}
                />
                <MarketMobileStatRow
                  label="Net APY"
                  value={formatPct(row.netApyPct)}
                  valueClassName="text-success"
                />
              </MarketMobileStatList>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="brand-secondary"
                  className="h-10 rounded-radius-sm px-4 text-[13px]"
                  onClick={(event) => {
                    event.stopPropagation()
                    router.push(actionPagePath("multiply", "multiply", { market: row.marketId, return: `/multiply/markets/${row.marketId}` }))
                  }}
                >
                  Multiply
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  className="h-10 rounded-radius-sm px-4 text-[13px]"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleverage?.(row.id)
                  }}
                >
                  Deleverage
                </Button>
              </div>
            </MarketMobileCard>
          ))}
        </div>
      </div>
    </section>
  )
}
