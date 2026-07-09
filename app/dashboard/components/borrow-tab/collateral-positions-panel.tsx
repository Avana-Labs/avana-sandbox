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
import { getDashboardCollateralData, type CollateralAssetRow } from "./asset-positions-data"

const MASK = "••••"
const HEADER_CLASS =
  "whitespace-nowrap bg-table-header px-4 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground"

export function CollateralPositionsPanel({
  showBalance = true,
  returnHref,
}: {
  showBalance?: boolean
  returnHref?: string
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const { exact } = useCurrency()
  const { summary, rows } = getDashboardCollateralData()
  const m = (value: string) => (showBalance ? value : MASK)

  const summaryMetrics: SummaryMetric[] = [
    { label: "Deposited", value: m(exact(summary.depositedUsd)), help: "Total value you've supplied across assets." },
    {
      label: "Net Deposit APY",
      value: `${summary.netDepositApyPct.toFixed(2)}%`,
      help: "Blended supply yield across your deposited assets.",
      valueClassName: "text-brand",
    },
    { label: "Interest Earned", value: m(exact(summary.interestEarnedUsd)), help: "Total yield accrued across your deposits." },
  ]

  const detailHref = (marketId: string) => `/lend/markets/${marketId}`

  const goDeposit = (marketId: string) =>
    router.push(actionPagePath("lend", "deposit", { market: marketId, return: returnHref ?? detailHref(marketId) }))
  const goWithdraw = (marketId: string) =>
    router.push(actionPagePath("lend", "withdraw", { market: marketId, return: returnHref ?? detailHref(marketId) }))

  if (rows.length === 0) {
    return (
      <section>
        <AssetSummaryStrip metrics={summaryMetrics} />
        <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
          {t("No collateral deposited yet. Supply an asset to start backing loans.")}
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
                  <th className={cn(HEADER_CLASS, "text-right")}>{t("Deposited")}</th>
                  <th className={cn(HEADER_CLASS, "text-right")}>{t("APY")}</th>
                  <th className={cn(HEADER_CLASS, "text-right")}>{t("Earnings")}</th>
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
                      <TokenUsdCell token={m(row.depositedToken)} usd={m(exact(row.depositedUsd))} />
                    </td>
                    <td className={cn("py-3.5 text-right font-data text-[13px] font-medium tabular-nums text-foreground", TABLE_ROW_HOVER_BG)}>
                      {row.apyPct.toFixed(2)}%
                    </td>
                    <td className={cn("py-3.5 text-right", TABLE_ROW_HOVER_BG)}>
                      <TokenUsdCell token={m(row.earningsToken)} usd={m(exact(row.earningsUsd))} />
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
                            goDeposit(row.marketId)
                          }}
                        >
                          <ActionIcon label="Deposit" />
                          {t("Deposit")}
                        </Button>
                        <Button
                          type="button"
                          size="table"
                          variant="table-secondary"
                          className="w-auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            goWithdraw(row.marketId)
                          }}
                        >
                          <ActionIcon label="Withdraw" />
                          {t("Withdraw")}
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
          <CollateralMobileCard
            key={row.id}
            row={row}
            mask={m}
            exact={exact}
            onDeposit={() => goDeposit(row.marketId)}
            onWithdraw={() => goWithdraw(row.marketId)}
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

function CollateralMobileCard({
  row,
  mask,
  exact,
  onDeposit,
  onWithdraw,
  onOpen,
}: {
  row: CollateralAssetRow
  mask: (v: string) => string
  exact: (usd: number) => string
  onDeposit: () => void
  onWithdraw: () => void
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
          label={t("Deposited")}
          value={
            <span>
              {mask(row.depositedToken)}
              <span className="ml-2 text-[12px] text-muted-foreground">{mask(exact(row.depositedUsd))}</span>
            </span>
          }
        />
        <MarketMobileStatRow
          label={t("Earnings")}
          value={
            <span>
              {mask(row.earningsToken)}
              <span className="ml-2 text-[12px] text-muted-foreground">{mask(exact(row.earningsUsd))}</span>
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
            onDeposit()
          }}
        >
          <ActionIcon label="Deposit" />
          {t("Deposit")}
        </Button>
        <Button
          type="button"
          variant="brand-secondary"
          className="h-10 rounded-radius-sm px-4 text-[13px]"
          onClick={(event) => {
            event.stopPropagation()
            onWithdraw()
          }}
        >
          <ActionIcon label="Withdraw" />
          {t("Withdraw")}
        </Button>
      </div>
    </MarketMobileCard>
  )
}
