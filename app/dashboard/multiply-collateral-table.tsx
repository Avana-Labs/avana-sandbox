"use client"

import { useRouter } from "next/navigation"
import { ActionIcon } from "@/app/components/action-icon"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import {
  MarketMobileActionFooter,
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileIdentityText,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { formatCompactUsd, formatUsdExact } from "@/app/lib/borrow-sim"
import type { PortfolioMultiplyCollateral } from "@/app/lib/data/providers/portfolio"
import { healthFactorBand } from "@/app/lib/health/health-factor-bands"
import { formatHealthFactor } from "@/app/lib/home-sim"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import {
  TABLE_BODY_ROW,
  TABLE_HEADER_ROW,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
} from "@/app/lib/ui/table-row-hover"
import { Button } from "@/components/ui/button"

const MASK = "••••"

function formatPct(value: number) {
  return `${value.toFixed(2)}%`
}

type PositionAction = "multiply" | "deleverage" | "close"

export function MultiplyCollateralTable({
  rows,
  returnHref,
  showHeading = true,
}: {
  rows: PortfolioMultiplyCollateral[]
  returnHref?: string
  showHeading?: boolean
}) {
  const router = useRouter()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const usd = (value: number) => (showDollarAmounts ? formatCompactUsd(value) : MASK)
  const liqPrice = (value: number | null) => (value == null ? "—" : showDollarAmounts ? formatUsdExact(value) : MASK)
  const activeRows = rows.filter((row) => row.status === "open" && row.collateralUsd > 0)
  const debtRows = activeRows.filter((row) => row.debtUsd > 0)

  const openPosition = (row: PortfolioMultiplyCollateral) => router.push(`/multiply/markets/${row.marketId}`)
  const openAction = (event: React.MouseEvent, row: PortfolioMultiplyCollateral, action: PositionAction) => {
    event.stopPropagation()
    router.push(
      actionPagePath("multiply", action, {
        market: row.marketId,
        return: returnHref ?? `/multiply/markets/${row.marketId}`,
      }),
    )
  }

  if (activeRows.length === 0) {
    return (
      <section>
        {showHeading ? (
          <h3 className="mb-4 text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">
            {t("Multiply Positions")}
          </h3>
        ) : null}
        <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
          {t("No active Multiply positions")}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-8">
      {showHeading ? (
        <div>
          <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">
            {t("Multiply Positions")}
          </h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("{count} positions").replace("{count}", String(activeRows.length))}
          </p>
        </div>
      ) : null}

      <section aria-labelledby="multiply-exposure-heading">
        <div className="mb-3">
          <h4 id="multiply-exposure-heading" className="text-[15px] font-medium text-foreground md:text-[16px]">
            {t("Exposure")}
          </h4>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t("Position size, multiplier, and current net yield")}
          </p>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <DesktopTableSurface className="!rounded-none">
            <table className="w-full min-w-[620px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className={TABLE_HEADER_ROW}>
                  <th className="px-5">{t("Market")}</th>
                  <th className="px-4 text-right">{t("Exposure")}</th>
                  <th className="px-4 text-right">{t("Multiplier")}</th>
                  <th className="px-4 text-right">{t("Net APY")}</th>
                  <SilentActionHeader className="!rounded-none pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-white/6">
                {activeRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`${TABLE_BODY_ROW} group cursor-pointer transition-colors`}
                    onClick={() => openPosition(row)}
                  >
                    <MarketCell row={row} hoverClass={TABLE_ROW_HOVER_LEFT} />
                    <ValueCell value={usd(row.collateralUsd)} />
                    <ValueCell value={`${row.multiplier.toFixed(2)}x`} />
                    <ValueCell value={formatPct(row.netApyPct)} valueClassName="text-success" />
                    <td className={`px-4 py-3 pr-5 ${TABLE_ROW_HOVER_RIGHT}`}>
                      <HoverActionGroup>
                        <Button
                          type="button"
                          size="table"
                          variant="table-primary"
                          className="w-auto"
                          onClick={(event) => openAction(event, row, "multiply")}
                        >
                          <ActionIcon label="Multiply" />
                          {t("Multiply")}
                        </Button>
                      </HoverActionGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopTableSurface>
        </div>
        <div className="space-y-3 md:hidden">
          {activeRows.map((row, index) => (
            <MarketMobileCard key={row.id} clickable className="space-y-3" onClick={() => openPosition(row)}>
              <PositionMobileHeader
                row={row}
                index={index}
                metric={`${row.multiplier.toFixed(2)}x`}
                label="Multiplier"
              />
              <MarketMobileStatList>
                <MarketMobileStatRow label={t("Exposure")} value={usd(row.collateralUsd)} />
                <MarketMobileStatRow
                  label={t("Net APY")}
                  value={formatPct(row.netApyPct)}
                  valueClassName="text-success"
                />
              </MarketMobileStatList>
              <MarketMobileActionFooter columns={1}>
                <Button
                  type="button"
                  variant="brand"
                  className="h-11 rounded-radius-sm text-[14px] font-normal"
                  onClick={(event) => openAction(event, row, "multiply")}
                >
                  <ActionIcon label="Multiply" />
                  {t("Multiply")}
                </Button>
              </MarketMobileActionFooter>
            </MarketMobileCard>
          ))}
        </div>
      </section>

      <section aria-labelledby="multiply-debt-heading">
        <div className="mb-3">
          <h4 id="multiply-debt-heading" className="text-[15px] font-medium text-foreground md:text-[16px]">
            {t("Debt & Risk")}
          </h4>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t("Borrowed balance, health factor, and liquidation threshold")}
          </p>
        </div>
        {debtRows.length === 0 ? (
          <div className="rounded-radius-md border border-dashed border-border px-6 py-8 text-center text-[13px] text-muted-foreground">
            {t("No active Multiply debt")}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <DesktopTableSurface className="!rounded-none">
                <table className="w-full min-w-[620px] table-fixed border-separate border-spacing-0 text-[13px]">
                  <colgroup>
                    <col className="w-[31%]" />
                    <col className="w-[17%]" />
                    <col className="w-[14%]" />
                    <col className="w-[16%]" />
                    <col className="w-[22%]" />
                  </colgroup>
                  <thead>
                    <tr className={TABLE_HEADER_ROW}>
                      <th className="px-5">{t("Market")}</th>
                      <th className="px-4 text-right">{t("Debt")}</th>
                      <th className="px-4 text-right">{t("Health")}</th>
                      <th className="px-4 text-right">{t("Liq. price")}</th>
                      <SilentActionHeader className="!rounded-none pr-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-white/6">
                    {debtRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`${TABLE_BODY_ROW} group cursor-pointer transition-colors`}
                        onClick={() => openPosition(row)}
                      >
                        <MarketCell row={row} hoverClass={TABLE_ROW_HOVER_LEFT} />
                        <ValueCell value={usd(row.debtUsd)} />
                        <ValueCell
                          value={formatHealthFactor(row.healthFactor)}
                          valueClassName={healthFactorBand(row.healthFactor).textClass}
                        />
                        <ValueCell value={liqPrice(row.liquidationPriceUsd)} />
                        <td className={`px-4 py-3 pr-5 ${TABLE_ROW_HOVER_RIGHT}`}>
                          <HoverActionGroup>
                            <Button
                              type="button"
                              size="table"
                              variant="table-secondary"
                              className="w-auto"
                              onClick={(event) => openAction(event, row, "deleverage")}
                            >
                              <ActionIcon label="Deleverage" />
                              {t("Deleverage")}
                            </Button>
                            <Button
                              type="button"
                              size="table"
                              variant="table-secondary"
                              className="w-auto"
                              onClick={(event) => openAction(event, row, "close")}
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
            <div className="space-y-3 md:hidden">
              {debtRows.map((row, index) => (
                <MarketMobileCard key={row.id} clickable className="space-y-3" onClick={() => openPosition(row)}>
                  <PositionMobileHeader row={row} index={index} metric={usd(row.debtUsd)} label="Debt" />
                  <MarketMobileStatList>
                    <MarketMobileStatRow
                      label={t("Health")}
                      value={formatHealthFactor(row.healthFactor)}
                      valueClassName={healthFactorBand(row.healthFactor).textClass}
                    />
                    <MarketMobileStatRow label={t("Liq. price")} value={liqPrice(row.liquidationPriceUsd)} />
                  </MarketMobileStatList>
                  <MarketMobileActionFooter columns={2}>
                    <Button
                      type="button"
                      variant="brand"
                      className="h-11 rounded-radius-sm text-[14px] font-normal"
                      onClick={(event) => openAction(event, row, "deleverage")}
                    >
                      <ActionIcon label="Deleverage" />
                      {t("Deleverage")}
                    </Button>
                    <Button
                      type="button"
                      variant="brand-secondary"
                      className="h-11 rounded-radius-sm text-[14px] font-normal"
                      onClick={(event) => openAction(event, row, "close")}
                    >
                      {t("Close")}
                    </Button>
                  </MarketMobileActionFooter>
                </MarketMobileCard>
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  )
}

function MarketCell({ row, hoverClass }: { row: PortfolioMultiplyCollateral; hoverClass: string }) {
  return (
    <td className={`py-3 pl-5 pr-4 ${hoverClass}`}>
      <div className="flex items-center gap-2.5">
        <TokenIcon symbol={row.collateralToken} size="table" />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-foreground dark:text-white">{row.label}</span>
          <span className="mt-0.5 block truncate text-[13px] text-muted-foreground dark:text-white/38">
            {row.collateralToken} / {row.borrowableToken}
          </span>
        </span>
      </div>
    </td>
  )
}

function ValueCell({
  value,
  valueClassName = "text-foreground dark:text-white",
}: {
  value: string
  valueClassName?: string
}) {
  return (
    <td className={`px-4 py-3 text-right font-data text-[13px] tabular-nums ${valueClassName} ${TABLE_ROW_HOVER_BG}`}>
      {value}
    </td>
  )
}

function PositionMobileHeader({
  row,
  index,
  metric,
  label,
}: {
  row: PortfolioMultiplyCollateral
  index: number
  metric: string
  label: string
}) {
  const { t } = useTranslation()
  return (
    <MarketMobileCardHeader
      identity={
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-[12px] text-muted-foreground">{index + 1}</span>
          <TokenIcon symbol={row.collateralToken} size="table" />
          <MarketMobileIdentityText title={row.label} subtitle={`${row.collateralToken} / ${row.borrowableToken}`} />
        </div>
      }
      metric={<MarketMobileMetric value={metric} label={t(label)} valueClassName="text-foreground dark:text-white" />}
    />
  )
}
