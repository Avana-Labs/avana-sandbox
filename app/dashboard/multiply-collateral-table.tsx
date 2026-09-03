"use client"

import { useRouter } from "next/navigation"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import {
  MarketMobileActionFooter,
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileIdentityText,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { pairedLoopBorrowPx, TOKEN_ICON_TABLE_PAIR_WIDTH_PX, TOKEN_ICON_TABLE_PX } from "@/app/lib/token-icon-sizes"
import { formatCompactUsd, formatUsdExact } from "@/app/lib/borrow-sim"
import type { PortfolioMultiplyCollateral } from "@/app/lib/data/providers/portfolio"
import { healthFactorBand } from "@/app/lib/health/health-factor-bands"
import {
  translateMultiplyLoopBorrowLabel,
  translateMultiplyLoopSupplyLabel,
} from "@/app/lib/multiply-system/market-labels"
import { formatHealthFactor } from "@/app/lib/home-sim"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import {
  TABLE_BASE,
  TABLE_BODY_ROW,
  TABLE_CELL_NUMERIC,
  TABLE_CELL_PADDING,
  TABLE_CELL_PADDING_TRAILING,
  TABLE_CELL_PRIMARY,
  TABLE_CELL_SECONDARY,
  TABLE_HEADER_CELL,
  TABLE_HEADER_ROW,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
  formatTableHeaderLabel,
} from "@/app/lib/ui/table-row-hover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MASK = "••••"

function positionEquityUsd(row: PortfolioMultiplyCollateral) {
  return Math.max(0, row.collateralUsd - row.debtUsd)
}

export function MultiplyCollateralTable({
  rows,
  returnHref: _returnHref,
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

  const openPosition = (row: PortfolioMultiplyCollateral) => router.push(`/multiply/markets/${row.marketId}`)
  const openManage = (event: React.MouseEvent, row: PortfolioMultiplyCollateral) => {
    event.stopPropagation()
    openPosition(row)
  }

  if (activeRows.length === 0) {
    return (
      <section>
        {showHeading ? (
          <h3 className="mb-4 text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">
            {t("Loop Positions")}
          </h3>
        ) : null}
        <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
          {t("No active Multiply positions")}
        </div>
      </section>
    )
  }

  return (
    <section>
      {showHeading ? (
        <div className="mb-4">
          <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">
            {t("Loop Positions")}
          </h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("Exposure, return, and liquidation risk for each active loop")}
          </p>
        </div>
      ) : null}

      <div className="hidden overflow-x-auto md:block">
        <DesktopTableSurface className="!rounded-none">
          <table className={`w-full min-w-[720px] table-fixed border-separate border-spacing-0 ${TABLE_BASE}`}>
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[18%]" />
              <col className="w-[20%]" />
              <col className="w-[22%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className={TABLE_HEADER_ROW}>
                <th className={cn(TABLE_HEADER_CELL, "px-5")}>{formatTableHeaderLabel(t("Loop"))}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4")}>{formatTableHeaderLabel(t("Equity"))}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4")}>{formatTableHeaderLabel(t("Exposure"))}</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4")}>{formatTableHeaderLabel(t("Risk"))}</th>
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
                  <LoopCell row={row} />
                  <PositionCell row={row} usd={usd} />
                  <RiskCell row={row} liqPrice={liqPrice} />
                  <td className={cn(TABLE_CELL_PADDING_TRAILING, TABLE_ROW_HOVER_RIGHT)}>
                    <HoverActionGroup>
                      <Button
                        type="button"
                        size="table"
                        variant="table-secondary"
                        className="w-auto min-w-[88px]"
                        onClick={(event) => openManage(event, row)}
                      >
                        {t("Manage")}
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
        {activeRows.map((row) => (
          <MarketMobileCard key={row.id} clickable className="space-y-3" onClick={() => openPosition(row)}>
            <MarketMobileCardHeader identity={<LoopIdentity row={row} />} />
            <MarketMobileStatList>
              <MarketMobileStatRow
                label={t("Position")}
                value={`${usd(positionEquityUsd(row))} · ${row.multiplier.toFixed(2)}×`}
              />
              <MarketMobileStatRow
                label={t("Exposure")}
                value={`${usd(row.collateralUsd)} · ${usd(row.debtUsd)} ${t("debt")}`}
              />
              <MarketMobileStatRow
                label={t("Risk")}
                value={`${t("HF")} ${formatHealthFactor(row.healthFactor)} · ${t("Liq.")} ${liqPrice(row.liquidationPriceUsd)}`}
                valueClassName={healthFactorBand(row.healthFactor).textClass}
              />
            </MarketMobileStatList>
            <MarketMobileActionFooter columns={1}>
              <Button
                type="button"
                variant="brand-secondary"
                className="h-11 rounded-radius-sm text-[14px] font-normal"
                onClick={(event) => openManage(event, row)}
              >
                {t("Manage")}
              </Button>
            </MarketMobileActionFooter>
          </MarketMobileCard>
        ))}
      </div>
    </section>
  )
}

function PairedTokenIcons({ row }: { row: PortfolioMultiplyCollateral }) {
  const borrowPx = pairedLoopBorrowPx(TOKEN_ICON_TABLE_PX)

  return (
    <span
      className="relative block shrink-0"
      style={{ height: TOKEN_ICON_TABLE_PX, width: TOKEN_ICON_TABLE_PAIR_WIDTH_PX }}
    >
      <TokenIcon symbol={row.collateralToken} size="table" className="absolute left-0 top-0" />
      <TokenIcon
        symbol={row.borrowableToken}
        size="md"
        pixelSize={borrowPx}
        className="absolute bottom-0 right-0 z-10"
      />
    </span>
  )
}

function LoopIdentity({ row }: { row: PortfolioMultiplyCollateral }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PairedTokenIcons row={row} />
      <MarketMobileIdentityText
        title={translateMultiplyLoopSupplyLabel(t, row.collateralToken)}
        subtitle={translateMultiplyLoopBorrowLabel(t, row.borrowableToken)}
      />
    </div>
  )
}

function LoopCell({ row }: { row: PortfolioMultiplyCollateral }) {
  const { t } = useTranslation()
  return (
    <td className={cn(TABLE_CELL_PADDING, "pl-5", TABLE_ROW_HOVER_LEFT)}>
      <div className="flex min-w-0 items-center gap-3">
        <PairedTokenIcons row={row} />
        <span className="min-w-0">
          <span className={cn("block truncate", TABLE_CELL_PRIMARY)}>
            {translateMultiplyLoopSupplyLabel(t, row.collateralToken)}
          </span>
          <span className={cn("block truncate", TABLE_CELL_SECONDARY)}>
            {translateMultiplyLoopBorrowLabel(t, row.borrowableToken)}
          </span>
        </span>
      </div>
    </td>
  )
}

function PositionCell({ row, usd }: { row: PortfolioMultiplyCollateral; usd: (value: number) => string }) {
  const { t } = useTranslation()
  return (
    <>
      <td className={cn(TABLE_CELL_PADDING, TABLE_ROW_HOVER_BG)}>
        <span className={cn("block", TABLE_CELL_NUMERIC)}>{usd(positionEquityUsd(row))}</span>
        <span className={cn("block", TABLE_CELL_SECONDARY)}>
          {row.multiplier.toFixed(2)}× {t("leverage")}
        </span>
      </td>
      <td className={cn(TABLE_CELL_PADDING, TABLE_ROW_HOVER_BG)}>
        <span className={cn("block", TABLE_CELL_NUMERIC)}>{usd(row.collateralUsd)}</span>
        {/* Net APY is a portfolio-level figure (Multiply Balance), not per-loop — show the borrowed
        portion here instead: equity + this debt = the exposure above. */}
        <span className={cn("block", TABLE_CELL_SECONDARY)}>
          {usd(row.debtUsd)} {t("debt")}
        </span>
      </td>
    </>
  )
}

function RiskCell({ row, liqPrice }: { row: PortfolioMultiplyCollateral; liqPrice: (value: number | null) => string }) {
  const { t } = useTranslation()
  return (
    <td className={cn(TABLE_CELL_PADDING, TABLE_ROW_HOVER_BG)}>
      <span className={cn("block", TABLE_CELL_NUMERIC, healthFactorBand(row.healthFactor).textClass)}>
        {t("HF")} {formatHealthFactor(row.healthFactor)}
      </span>
      <span className={cn("block", TABLE_CELL_SECONDARY)}>
        {t("Liq. at")} {liqPrice(row.liquidationPriceUsd)}
      </span>
    </td>
  )
}
