"use client"

import { useRouter } from "next/navigation"
import { ActionIcon } from "@/app/components/action-icon"
import { TokenIcon } from "@/app/components/token-icon"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
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
import { healthFactorBand } from "@/app/lib/health/health-factor-bands"

const MASK = "••••"

function formatPct(value: number) {
  return `${value.toFixed(2)}%`
}

function formatHealthFactor(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "∞"
}

export function MultiplyCollateralTable({
  rows,
  returnHref,
  showHeading = true,
}: {
  rows: PortfolioMultiplyCollateral[]
  // Close-button destination for the launched action flow. Defaults to the
  // market detail page; the dashboard passes its own URL so close returns here.
  returnHref?: string
  showHeading?: boolean
}) {
  const router = useRouter()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const usd = (value: number) => (showDollarAmounts ? formatCompactUsd(value) : MASK)

  if (rows.length === 0) return null

  return (
    <section>
      {showHeading ? (
        <div className="mb-4">
          <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">{t("Multiply Positions")}</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("{count} positions").replace("{count}", String(rows.length))}
          </p>
        </div>
      ) : null}
      <div className="rounded-radius-md bg-transparent dark:bg-transparent">
        <div className="hidden overflow-x-auto md:block">
          <DesktopTableSurface className="!rounded-none">
            <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                  <th className="bg-table-header px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Market")}
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Exposure")}
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Multiplier")}
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Debt")}
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Health")}
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Net APY")}
                  </th>
                  <SilentActionHeader className="!rounded-none pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-white/6">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group cursor-pointer transition-colors"
                    onClick={() => router.push(`/multiply/markets/${row.marketId}`)}
                  >
                    <td className={`py-3 pl-5 pr-4 ${TABLE_ROW_HOVER_LEFT}`}>
                      <div className="flex items-center gap-2.5">
                        <TokenIcon symbol={row.collateralToken} size="table" />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                            {row.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground dark:text-white/38">
                            {row.collateralToken} / {row.borrowableToken}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-data tabular-nums text-[13px] text-foreground dark:text-white ${TABLE_ROW_HOVER_BG}`}
                    >
                      {usd(row.collateralUsd)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-data tabular-nums text-[13px] text-foreground dark:text-white ${TABLE_ROW_HOVER_BG}`}
                    >
                      {row.multiplier.toFixed(2)}x
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-data tabular-nums text-[13px] text-foreground dark:text-white ${TABLE_ROW_HOVER_BG}`}
                    >
                      {usd(row.debtUsd)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-data tabular-nums text-[13px] ${healthFactorBand(row.healthFactor).textClass} ${TABLE_ROW_HOVER_BG}`}
                    >
                      {formatHealthFactor(row.healthFactor)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-data tabular-nums text-[13px] text-foreground dark:text-white ${TABLE_ROW_HOVER_BG}`}
                    >
                      {formatPct(row.netApyPct)}
                    </td>
                    <td className={`px-4 py-3 pr-5 ${TABLE_ROW_HOVER_RIGHT}`}>
                      <HoverActionGroup className="gap-2">
                        <Button
                          type="button"
                          size="table"
                          variant="table-primary"
                          className="w-auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            router.push(
                              actionPagePath("multiply", "multiply", {
                                market: row.marketId,
                                return: returnHref ?? `/multiply/markets/${row.marketId}`,
                              }),
                            )
                          }}
                        >
                          <ActionIcon label="Multiply" />
                          {t("Multiply")}
                        </Button>
                        <Button
                          type="button"
                          size="table"
                          variant="table-secondary"
                          className="w-auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            router.push(
                              actionPagePath("multiply", "deleverage", {
                                market: row.marketId,
                                return: returnHref ?? `/multiply/markets/${row.marketId}`,
                              }),
                            )
                          }}
                        >
                          <ActionIcon label="Deleverage" />
                          {t("Deleverage")}
                        </Button>
                        <Button
                          type="button"
                          size="table"
                          variant="table-secondary"
                          className="w-auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            router.push(
                              actionPagePath("multiply", "close", {
                                market: row.marketId,
                                return: returnHref ?? `/multiply/markets/${row.marketId}`,
                              }),
                            )
                          }}
                        >
                          {t("Close")}
                        </Button>
                      </HoverActionGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopTableSurface>
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
                    <span className="text-[13px] tracking-[-0.03em] text-muted-foreground dark:text-white/38">
                      {index + 1}
                    </span>
                    <TokenIcon symbol={row.collateralToken} size="table" />
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
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
                    label={t("Multiplier")}
                    valueClassName="text-foreground dark:text-white"
                  />
                }
              />

              <MarketMobileStatList>
                <MarketMobileStatRow label={t("Exposure")} value={usd(row.collateralUsd)} />
                <MarketMobileStatRow label={t("Debt")} value={usd(row.debtUsd)} />
                <MarketMobileStatRow
                  label={t("Health")}
                  value={formatHealthFactor(row.healthFactor)}
                  valueClassName={healthFactorBand(row.healthFactor).textClass}
                />
                <MarketMobileStatRow
                  label={t("Net APY")}
                  value={formatPct(row.netApyPct)}
                  valueClassName="text-success"
                />
              </MarketMobileStatList>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="brand-secondary"
                  className="h-11 gap-2.5 rounded-radius-sm px-4 text-[14px] font-bold [&_svg]:size-[18px]"
                  onClick={(event) => {
                    event.stopPropagation()
                    router.push(
                      actionPagePath("multiply", "multiply", {
                        market: row.marketId,
                        return: returnHref ?? `/multiply/markets/${row.marketId}`,
                      }),
                    )
                  }}
                >
                  <ActionIcon label="Multiply" />
                  {t("Multiply")}
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  className="h-11 gap-2.5 rounded-radius-sm px-4 text-[14px] font-bold [&_svg]:size-[18px]"
                  onClick={(event) => {
                    event.stopPropagation()
                    router.push(
                      actionPagePath("multiply", "deleverage", {
                        market: row.marketId,
                        return: returnHref ?? `/multiply/markets/${row.marketId}`,
                      }),
                    )
                  }}
                >
                  <ActionIcon label="Deleverage" />
                  {t("Deleverage")}
                </Button>
                <Button
                  type="button"
                  variant="brand-secondary"
                  className="h-11 gap-2.5 rounded-radius-sm px-4 text-[14px] font-bold [&_svg]:size-[18px]"
                  onClick={(event) => {
                    event.stopPropagation()
                    router.push(
                      actionPagePath("multiply", "close", {
                        market: row.marketId,
                        return: returnHref ?? `/multiply/markets/${row.marketId}`,
                      }),
                    )
                  }}
                >
                  {t("Close")}
                </Button>
              </div>
            </MarketMobileCard>
          ))}
        </div>
      </div>
    </section>
  )
}
