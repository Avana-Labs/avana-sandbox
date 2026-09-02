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
          <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[35%]" />
              <col className="w-[21%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className={TABLE_HEADER_ROW}>
                <th className="px-5">{t("Loop")}</th>
                <th className="px-4">{t("Position")}</th>
                <th className="px-4">{t("Risk")}</th>
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
                  <td className={`px-4 py-4 pr-5 ${TABLE_ROW_HOVER_RIGHT}`}>
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
                label={t("Exposure · Net APY")}
                value={`${usd(row.collateralUsd)} · ${formatPct(row.netApyPct)}`}
                valueClassName="text-success"
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
  return (
    <span className="relative block h-12 w-[58px] shrink-0">
      <TokenIcon symbol={row.collateralToken} size="table" className="absolute left-0 top-0" />
      <span className="absolute bottom-[-2px] right-0 rounded-full bg-background p-0.5 ring-2 ring-background">
        <TokenIcon symbol={row.borrowableToken} size="sm" />
      </span>
    </span>
  )
}

function LoopIdentity({ row }: { row: PortfolioMultiplyCollateral }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PairedTokenIcons row={row} />
      <MarketMobileIdentityText
        title={`${row.collateralToken} ${t("loop")}`}
        subtitle={`${t("Borrowing")} ${row.borrowableToken}`}
      />
    </div>
  )
}

function LoopCell({ row }: { row: PortfolioMultiplyCollateral }) {
  const { t } = useTranslation()
  return (
    <td className={`py-4 pl-5 pr-4 ${TABLE_ROW_HOVER_LEFT}`}>
      <div className="flex min-w-0 items-center gap-3">
        <PairedTokenIcons row={row} />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-foreground dark:text-white">
            {row.collateralToken} {t("loop")}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-muted-foreground dark:text-white/38">
            {t("Borrowing")} {row.borrowableToken}
          </span>
        </span>
      </div>
    </td>
  )
}

function PositionCell({ row, usd }: { row: PortfolioMultiplyCollateral; usd: (value: number) => string }) {
  const { t } = useTranslation()
  return (
    <td className={`px-4 py-4 ${TABLE_ROW_HOVER_BG}`}>
      <span className="block font-data text-[13px] tabular-nums text-foreground dark:text-white">
        {usd(positionEquityUsd(row))} {t("equity")} · {row.multiplier.toFixed(2)}×
      </span>
      <span className="mt-1 block font-data text-[13px] tabular-nums text-muted-foreground">
        {usd(row.collateralUsd)} {t("exposure")} · {formatPct(row.netApyPct)} {t("Net APY")}
      </span>
    </td>
  )
}

function RiskCell({ row, liqPrice }: { row: PortfolioMultiplyCollateral; liqPrice: (value: number | null) => string }) {
  const { t } = useTranslation()
  return (
    <td className={`px-4 py-4 ${TABLE_ROW_HOVER_BG}`}>
      <span className={`block font-data text-[13px] tabular-nums ${healthFactorBand(row.healthFactor).textClass}`}>
        {t("HF")} {formatHealthFactor(row.healthFactor)}
      </span>
      <span className="mt-1 block font-data text-[13px] tabular-nums text-muted-foreground">
        {t("Liq. at")} {liqPrice(row.liquidationPriceUsd)}
      </span>
    </td>
  )
}
