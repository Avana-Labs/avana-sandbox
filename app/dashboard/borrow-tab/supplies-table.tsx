"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { DASHBOARD_SNAPSHOT_SURFACE_CLASS } from "@/app/components/card-surface-tokens"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import {
  BORROW_SUPPLY_META,
  formatHealthFactor,
  healthFactorToneClass,
  homeVisualToBorrowVisual,
} from "@/app/lib/data/borrow-domain"
import type { SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import {
  HF_ZONES,
  activeHealthFactorZoneIndex,
  healthFactorBarTone,
  healthFactorStatusLabel,
} from "@/app/lib/action-system/health-factor-ui"
import { HfNumber, TokenPairCell } from "@/app/borrow/components/atoms"
import { DesktopTableSurface } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { HealthFactorPositionBar } from "@/app/components/action-page/action-health-factor-bar"
import { formatApy } from "@/app/lib/format"
import { formatSectionCount } from "@/app/lib/ui/section-count"
import { cn } from "@/lib/utils"
import {
  TABLE_BASE,
  TABLE_BODY_ROW,
  TABLE_CELL_NUMERIC,
  TABLE_CELL_PADDING,
  TABLE_CELL_PADDING_TRAILING,
  TABLE_HEADER_CELL,
  TABLE_HEADER_ROW,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
  formatTableHeaderLabel,
} from "@/app/lib/ui/table-row-hover"

type SuppliesTableProps = {
  rows: SupplyRowContext[]
  totals: { collateral: number; borrowed: number; available: number; fees: number; averageHf: number | null }
  onBorrowMore: (context: SupplyRowContext) => void
  onAddCollateral?: (context: SupplyRowContext) => void
  onRemove?: (context: SupplyRowContext) => void
  showBalance?: boolean
  showSummary?: boolean
  showHeading?: boolean
}

const MASK = "••••"

export function SuppliesPanel({
  rows,
  totals,
  showBalance = true,
  showSummary = true,
  showHeading = true,
}: SuppliesTableProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { compact } = useCurrency()
  const m = (value: string) => (showBalance ? value : MASK)
  return (
    <section className="mb-2">
      {showSummary ? (
        <SuppliesHealthFactorCard averageHealthFactor={totals.averageHf} showBalance={showBalance} />
      ) : null}
      {showHeading ? (
        <div className="mb-3">
          <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">
            {t("My Collaterals")}
          </h3>
          <p className="mt-1 text-[13px] text-muted-foreground">{formatSectionCount(rows.length, "asset", "assets")}</p>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
          {t("No collateral deposited yet. Supply an asset to start backing loans.")}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <DesktopTableSurface className="!rounded-none">
              <div className="overflow-x-auto">
                <table className={`w-full min-w-[560px] table-fixed border-separate border-spacing-0 ${TABLE_BASE}`}>
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[20%]" />
                    <col className="w-[20%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead>
                    <tr className={TABLE_HEADER_ROW}>
                      <th className={cn(TABLE_HEADER_CELL, "px-5 text-left")}>{formatTableHeaderLabel(t("Pool"))}</th>
                      <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>
                        {formatTableHeaderLabel(t("Collateral"))}
                      </th>
                      <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>
                        {formatTableHeaderLabel(t("Borrow Power"))}
                      </th>
                      <th className={cn(TABLE_HEADER_CELL, "px-4 pr-5 text-right")}>
                        {formatTableHeaderLabel(t("Health"))}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-white/6">
                    {rows.map((row) => {
                      const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [
                        ReturnType<typeof homeVisualToBorrowVisual>,
                        ReturnType<typeof homeVisualToBorrowVisual>,
                      ]
                      const meta = BORROW_SUPPLY_META[row.pool.id]
                      const hfTone = healthFactorToneClass(row.healthFactor)
                      const detailHref = `/borrow/markets/${row.pool.id}`
                      return (
                        <tr
                          key={row.pool.id}
                          className={`${TABLE_BODY_ROW} group cursor-pointer transition-colors`}
                          onClick={() => router.push(detailHref)}
                        >
                          <td className={`${TABLE_CELL_PADDING} pl-5 ${TABLE_ROW_HOVER_LEFT}`}>
                            <TokenPairCell
                              visuals={visuals}
                              name={row.pool.name}
                              subtitle={meta?.venue ?? row.pool.venue}
                              size="md"
                            />
                          </td>
                          <td className={cn(TABLE_CELL_PADDING, "text-right", TABLE_CELL_NUMERIC, TABLE_ROW_HOVER_BG)}>
                            {m(compact(row.pool.collateralUsd))}
                          </td>
                          <td className={cn(TABLE_CELL_PADDING, "text-right", TABLE_CELL_NUMERIC, TABLE_ROW_HOVER_BG)}>
                            {m(compact(row.remainingBorrowPowerUsd))}
                          </td>
                          <td className={cn(TABLE_CELL_PADDING_TRAILING, "text-right", TABLE_ROW_HOVER_RIGHT)}>
                            <HfNumber size="table" value={m(formatHealthFactor(row.healthFactor))} tone={hfTone} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </DesktopTableSurface>
          </div>

          <ul className="space-y-5 md:hidden">
            {rows.map((row) => {
              const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [
                ReturnType<typeof homeVisualToBorrowVisual>,
                ReturnType<typeof homeVisualToBorrowVisual>,
              ]
              const hf = row.healthFactor
              // Single-source the label through formatHealthFactor so the mobile card
              // caps/formats health identically to the desktop table and the hero card.
              const hfLabel = formatHealthFactor(hf)
              const hfTone = healthFactorBarTone(hf)
              return (
                <MarketMobileCard
                  key={row.pool.id}
                  clickable
                  onClick={() => router.push(`/borrow/markets/${row.pool.id}`)}
                >
                  <MarketMobileCardHeader
                    identity={<TokenPairCell visuals={visuals} name={row.pool.name} size="md" />}
                    metric={<MarketMobileMetric value={m(compact(row.pool.collateralUsd))} label={t("Collateral")} />}
                  />
                  <MarketMobileStatList className="mt-3">
                    <MarketMobileStatRow label={t("Health")} value={m(hfLabel)} valueClassName={hfTone.text} />
                    <MarketMobileStatRow label={t("Borrowed")} value={m(compact(row.borrowedUsd))} />
                    <MarketMobileStatRow label={t("Borrow Power")} value={m(compact(row.remainingBorrowPowerUsd))} />
                    <MarketMobileStatRow label={t("LP APR")} value={formatApy(row.pairApr)} />
                  </MarketMobileStatList>
                </MarketMobileCard>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

export function SuppliesHealthFactorCard({
  averageHealthFactor,
  showBalance,
}: {
  averageHealthFactor: number | null
  showBalance: boolean
}) {
  const { t } = useTranslation()
  const status = healthFactorStatusLabel(averageHealthFactor)
  const hfLabel = formatHealthFactor(averageHealthFactor)
  const masked = !showBalance
  const activeZoneIdx = activeHealthFactorZoneIndex(averageHealthFactor)

  return (
    <div className={`${DASHBOARD_SNAPSHOT_SURFACE_CLASS} px-5 py-4 md:px-6 md:py-5`}>
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-data text-[20px] font-normal leading-none tracking-tight text-foreground">
            {masked ? "••" : hfLabel}
          </span>
          <span className="text-[13px] font-normal text-foreground">{t("Credit Health")}</span>
          <ActionMetricHelp
            topic="Credit Health"
            text={t(
              "Wallet-wide health factor: total liquidation value divided by total borrowed. 2.5 and above is comfortable; below 1.2 risks liquidation.",
            )}
          />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-table-header px-2.5 py-0.5 text-[10px] font-normal tracking-wide",
            status.tone === "positive" && "text-success",
            status.tone === "warning" && "text-amber-600",
            status.tone === "danger" && "text-rose-600",
            status.tone === "default" && "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              status.tone === "positive" && "bg-emerald-500",
              status.tone === "warning" && "bg-amber-500",
              status.tone === "danger" && "bg-rose-500",
              status.tone === "default" && "bg-muted-foreground",
            )}
          />
          {masked ? "••" : t(status.label)}
        </span>
      </div>

      <div className="mt-9">
        <HealthFactorPositionBar value={averageHealthFactor} heightClassName="h-2.5" />

        <div className="mt-4 flex h-4 items-center justify-between text-[11px] font-medium text-muted-foreground">
          {HF_ZONES.map((zone, index) => {
            const isActive = index === activeZoneIdx
            return (
              <span key={zone.id} className={cn("inline-flex items-center gap-1.5", isActive && "text-foreground")}>
                <span className={cn("size-1.5 rounded-full", isActive ? zone.color : cn(zone.color, "opacity-40"))} />
                {t(zone.label)}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
