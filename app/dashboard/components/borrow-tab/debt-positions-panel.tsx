"use client"

import { useRouter } from "next/navigation"
import { ActionIcon } from "@/app/components/action-icon"
import { Button } from "@/components/ui/button"
import { TokenIcon } from "@/app/components/token-icon"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { DesktopTableSurface, HoverActionGroup } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"
import { cn } from "@/lib/utils"
import { AssetSummaryStrip, type SummaryMetric } from "./asset-positions-shared"
import { getDashboardDebtData, type DebtAssetRow } from "./asset-positions-data"

const MASK = "••••"
const HEADER_CLASS =
  "whitespace-nowrap bg-table-header px-4 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground"

export function DebtPositionsPanel({
  showBalance = true,
  returnHref,
}: {
  showBalance?: boolean
  returnHref?: string
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const { exact } = useCurrency()
  const { summary, rows } = getDashboardDebtData()
  const m = (value: string) => (showBalance ? value : MASK)

  const summaryMetrics: SummaryMetric[] = [
    { label: "Borrowed", value: m(exact(summary.borrowedUsd)), help: "Total value you currently owe." },
    {
      label: "Borrow APY",
      value: `${summary.borrowApyPct.toFixed(2)}%`,
      help: "Blended interest rate across your open loans.",
      valueClassName: "text-brand",
    },
    { label: "Interest Owed", value: m(exact(summary.interestOwedUsd)), help: "Total interest accrued on your outstanding loans." },
  ]

  const detailHref = (marketId: string) => `/borrow/markets/${marketId}`

  const goBorrow = (marketId: string) =>
    router.push(actionPagePath("borrow", "borrow", { market: marketId, return: returnHref ?? detailHref(marketId) }))
  const goRepay = (marketId: string) =>
    router.push(actionPagePath("borrow", "repay", { market: marketId, return: returnHref ?? detailHref(marketId) }))

  if (rows.length === 0) {
    return (
      <section>
        <AssetSummaryStrip metrics={summaryMetrics} />
        <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
          {t("No active loans. Borrow against your collateral to get started.")}
        </div>
      </section>
    )
  }

  return (
    <section>
      <AssetSummaryStrip metrics={summaryMetrics} />

      {/* Desktop */}
      <div className="hidden md:block">
        <DesktopTableSurface className="rounded-radius-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[24%]" />
              </colgroup>
              <thead>
                <tr className="text-left">
                  <th className={cn(HEADER_CLASS, "rounded-l-radius-lg pl-5")}>{t("Asset")}</th>
                  <th className={cn(HEADER_CLASS, "text-right")}>{t("Borrowed")}</th>
                  <th className={cn(HEADER_CLASS, "text-right")}>{t("APY")}</th>
                  <th className={cn(HEADER_CLASS, "text-right")}>{t("Fees Paid")}</th>
                  <th className={cn(HEADER_CLASS, "rounded-r-radius-lg pr-5")} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-white/6">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group cursor-pointer transition-colors"
                    onClick={() => router.push(detailHref(row.marketId))}
                  >
                    <td className={cn("py-3.5 pl-5", TABLE_ROW_HOVER_LEFT)}>
                      <AssetIdentity symbol={row.symbol} name={row.name} />
                    </td>
                    <td className={cn("py-3.5 text-right", TABLE_ROW_HOVER_BG)}>
                      <TokenUsdCell token={m(row.borrowedToken)} usd={m(exact(row.borrowedUsd))} />
                    </td>
                    <td className={cn("py-3.5 text-right font-data text-[13px] font-medium tabular-nums text-foreground", TABLE_ROW_HOVER_BG)}>
                      {row.apyPct.toFixed(2)}%
                    </td>
                    <td className={cn("py-3.5 text-right", TABLE_ROW_HOVER_BG)}>
                      <TokenUsdCell token={m(row.feesToken)} usd={m(exact(row.feesUsd))} />
                    </td>
                    <td className={cn("py-3.5 pr-5", TABLE_ROW_HOVER_RIGHT)}>
                      <HoverActionGroup className="gap-2">
                        <Button
                          type="button"
                          size="table"
                          variant="table-primary"
                          className="w-auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            goRepay(row.marketId)
                          }}
                        >
                          <ActionIcon label="Repay" />
                          {t("Repay")}
                        </Button>
                        <Button
                          type="button"
                          size="table"
                          variant="table-secondary"
                          className="w-auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            goBorrow(row.marketId)
                          }}
                        >
                          <ActionIcon label="Borrow" />
                          {t("Borrow")}
                        </Button>
                      </HoverActionGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DesktopTableSurface>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <DebtMobileCard
            key={row.id}
            row={row}
            mask={m}
            exact={exact}
            onBorrow={() => goBorrow(row.marketId)}
            onRepay={() => goRepay(row.marketId)}
            onOpen={() => router.push(detailHref(row.marketId))}
          />
        ))}
      </div>
    </section>
  )
}

function AssetIdentity({ symbol, name }: { symbol: string; name: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <TokenIcon symbol={symbol} size="table" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-medium text-foreground">{name}</span>
        <span className="text-[11px] text-muted-foreground">{symbol}</span>
      </div>
    </div>
  )
}

function TokenUsdCell({ token, usd }: { token: string; usd: string }) {
  return (
    <div className="flex flex-col items-end pr-4">
      <span className="font-data text-[13px] font-medium tabular-nums text-foreground">{token}</span>
      <span className="font-data text-[11px] tabular-nums text-muted-foreground">{usd}</span>
    </div>
  )
}

function DebtMobileCard({
  row,
  mask,
  exact,
  onBorrow,
  onRepay,
  onOpen,
}: {
  row: DebtAssetRow
  mask: (v: string) => string
  exact: (usd: number) => string
  onBorrow: () => void
  onRepay: () => void
  onOpen: () => void
}) {
  const { t } = useTranslation()
  return (
    <MarketMobileCard clickable className="space-y-2" onClick={onOpen}>
      <MarketMobileCardHeader
        identity={
          <div className="flex min-w-0 items-center gap-2.5">
            <TokenIcon symbol={row.symbol} size="table" />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-foreground">{row.name}</div>
              <div className="text-[11px] text-muted-foreground">{row.symbol}</div>
            </div>
          </div>
        }
        metric={<MarketMobileMetric value={`${row.apyPct.toFixed(2)}%`} label="APY" />}
      />
      <MarketMobileStatList>
        <MarketMobileStatRow
          label={t("Borrowed")}
          value={
            <span>
              {mask(row.borrowedToken)}
              <span className="ml-2 text-[12px] text-muted-foreground">{mask(exact(row.borrowedUsd))}</span>
            </span>
          }
        />
        <MarketMobileStatRow
          label={t("Fees Paid")}
          value={
            <span>
              {mask(row.feesToken)}
              <span className="ml-2 text-[12px] text-muted-foreground">{mask(exact(row.feesUsd))}</span>
            </span>
          }
        />
      </MarketMobileStatList>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="brand"
          className="h-10 rounded-radius-sm px-4 text-[13px]"
          onClick={(event) => {
            event.stopPropagation()
            onBorrow()
          }}
        >
          <ActionIcon label="Borrow" />
          {t("Borrow")}
        </Button>
        <Button
          type="button"
          variant="brand-secondary"
          className="h-10 rounded-radius-sm px-4 text-[13px]"
          onClick={(event) => {
            event.stopPropagation()
            onRepay()
          }}
        >
          <ActionIcon label="Repay" />
          {t("Repay")}
        </Button>
      </div>
    </MarketMobileCard>
  )
}
