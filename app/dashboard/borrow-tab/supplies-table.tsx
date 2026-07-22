"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { ActionIcon } from "@/app/components/action-icon"
import { useRouter } from "next/navigation"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { Button } from "@/components/ui/button"
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
import { DesktopTableSurface, HoverActionGroup } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobilePrimaryAction,
  MarketMobileSecondaryAction,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { HealthFactorPositionBar } from "@/app/components/action-page/action-health-factor-bar"
import { formatApy } from "@/app/lib/format"
import { cn } from "@/lib/utils"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"

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
  onBorrowMore,
  onAddCollateral,
  showBalance = true,
  showSummary = true,
  showHeading = true,
}: SuppliesTableProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { compact } = useCurrency()
  const m = (value: string) => (showBalance ? value : MASK)
  if (rows.length === 0) {
    return (
      <div className="rounded-radius-md border border-dashed border-border bg-surface-raised/50 px-6 py-10 text-center text-[13px] text-muted-foreground">
        <div className="text-[20px] font-medium leading-snug tracking-tight text-brand">
          {t("Nothing supplied yet")}
        </div>
        <div className="mt-1 text-[15px] leading-snug">
          {t("To borrow you need to supply any LPs to be used as collateral")}
        </div>
      </div>
    )
  }
  return (
    <section className="mb-2">
      {showSummary ? (
        <SuppliesHealthFactorCard averageHealthFactor={totals.averageHf} showBalance={showBalance} />
      ) : null}
      {showHeading ? (
        <div className="mb-3">
          <h3 className="text-[14px] font-medium tracking-tight">{t("My LP Collaterals")}</h3>
        </div>
      ) : null}
      <div className="hidden md:block">
        <DesktopTableSurface className="!rounded-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[24%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                  <th className="bg-table-header px-5 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                    {t("Pool")}
                  </th>
                  <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                    {t("Collateral")}
                  </th>
                  <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                    {t("Borrow Power")}
                  </th>
                  <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                    {t("Health")}
                  </th>
                  <th className="bg-table-header px-5 pb-2 pt-2.5 pr-6 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58" />
                </tr>
              </thead>
              <tbody>
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
                      className="group cursor-pointer transition-colors"
                      onClick={() => router.push(detailHref)}
                    >
                      <td className={`py-3 pl-5 ${TABLE_ROW_HOVER_LEFT}`}>
                        <TokenPairCell
                          visuals={visuals}
                          name={row.pool.name}
                          subtitle={meta?.venue ?? row.pool.venue}
                          size="md"
                        />
                      </td>
                      <td
                        className={`py-3 pl-4 text-right font-data text-[13px] tabular-nums text-foreground ${TABLE_ROW_HOVER_BG}`}
                      >
                        {m(compact(row.pool.collateralUsd))}
                      </td>
                      <td
                        className={`py-3 pl-4 text-right font-data text-[13px] tabular-nums text-foreground ${TABLE_ROW_HOVER_BG}`}
                      >
                        {m(compact(row.remainingBorrowPowerUsd))}
                      </td>
                      <td className={`py-3 text-right ${TABLE_ROW_HOVER_BG}`}>
                        <HfNumber value={m(formatHealthFactor(row.healthFactor))} tone={hfTone} />
                      </td>
                      <td className={`py-3 pl-4 pr-6 text-left ${TABLE_ROW_HOVER_RIGHT}`}>
                        <HoverActionGroup align="start" className="gap-2">
                          <Button
                            type="button"
                            size="table"
                            variant="table-primary"
                            className="w-auto"
                            onClick={(event) => {
                              event.stopPropagation()
                              // Route through the parent callback so the close button returns to
                              // wherever the panel was launched from (e.g. the dashboard), not the
                              // market detail page. Fall back to the detail page if unwired.
                              if (onAddCollateral) onAddCollateral(row)
                              else
                                router.push(
                                  actionPagePath("borrow", "supply", { market: row.pool.id, return: detailHref }),
                                )
                            }}
                          >
                            <ActionIcon label="Pledge" />
                            {t("Pledge")}
                          </Button>
                          <Button
                            type="button"
                            size="table"
                            variant="table-secondary"
                            className="w-auto"
                            onClick={(event) => {
                              event.stopPropagation()
                              onBorrowMore(row)
                            }}
                          >
                            <ActionIcon label="Borrow" />
                            {t("Borrow")}
                          </Button>
                        </HoverActionGroup>
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
            <MarketMobileCard key={row.pool.id} clickable onClick={() => router.push(`/borrow/markets/${row.pool.id}`)}>
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
              <div className="mt-4 flex gap-2">
                <MarketMobileSecondaryAction
                  onClick={(event) => {
                    event.stopPropagation()
                    if (onAddCollateral) onAddCollateral(row)
                    else
                      router.push(
                        actionPagePath("borrow", "supply", {
                          market: row.pool.id,
                          return: `/borrow/markets/${row.pool.id}`,
                        }),
                      )
                  }}
                >
                  <ActionIcon label="Pledge" />
                  {t("Pledge")}
                </MarketMobileSecondaryAction>
                <MarketMobilePrimaryAction
                  className="mt-0 flex-1"
                  onClick={(event) => {
                    event.stopPropagation()
                    onBorrowMore(row)
                  }}
                >
                  <ActionIcon label="Borrow" />
                  {t("Borrow")}
                </MarketMobilePrimaryAction>
              </div>
            </MarketMobileCard>
          )
        })}
      </ul>
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
    <div className="mb-4 rounded-radius-md border border-border bg-card px-5 py-4 shadow-elev-1 md:px-6 md:py-5">
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-data text-[20px] font-bold leading-none tracking-tight text-foreground">
            {masked ? "••" : hfLabel}
          </span>
          <span className="text-[13px] font-semibold text-foreground">{t("Credit Health")}</span>
          <ActionMetricHelp
            topic="Credit Health"
            text={t(
              "Wallet-wide health factor: total liquidation value divided by total borrowed. 2.5 and above is comfortable; below 1.2 risks liquidation.",
            )}
          />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-table-header px-2.5 py-0.5 text-[10px] font-bold tracking-wide",
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
