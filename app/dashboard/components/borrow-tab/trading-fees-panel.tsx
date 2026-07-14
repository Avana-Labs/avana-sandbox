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
import { getDashboardTradingFeesData, type TradingFeeRow } from "./asset-positions-data"

const MASK = "••••"
const HEADER_CLASS =
  "whitespace-nowrap bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70"

export function TradingFeesPanel({
  showBalance = true,
  returnHref,
}: {
  showBalance?: boolean
  returnHref?: string
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const { exact } = useCurrency()
  const { summary, rows } = getDashboardTradingFeesData()
  const m = (value: string) => (showBalance ? value : MASK)

  const plPositive = summary.unrealizedPlPct >= 0
  const summaryMetrics: SummaryMetric[] = [
    { label: "Unclaimed Fees", value: m(exact(summary.unclaimedFeesUsd)), help: "Fees earned but not yet collected across your pools." },
    { label: "Fees Claimed", value: m(exact(summary.feesClaimedUsd)), help: "Trading fees you've already collected." },
    {
      label: "Unrealized P/L",
      value: (
        <span className="inline-flex items-baseline gap-2">
          {m(exact(summary.unrealizedPlUsd))}
          <span className={cn("text-[13px] font-medium", plPositive ? "text-success" : "text-danger")}>
            {plPositive ? "+" : ""}
            {summary.unrealizedPlPct.toFixed(2)}%
          </span>
        </span>
      ),
      help: "Change in position value versus your entry, excluding claimed fees.",
    },
  ]

  const detailHref = (marketId: string) => `/borrow/markets/${marketId}`

  const goClaim = (marketId: string) =>
    router.push(actionPagePath("borrow", "claim", { market: marketId, return: returnHref ?? detailHref(marketId) }))
  const goRemove = (marketId: string) =>
    router.push(actionPagePath("borrow", "remove", { market: marketId, return: returnHref ?? detailHref(marketId) }))

  if (rows.length === 0) {
    return (
      <section>
        <AssetSummaryStrip metrics={summaryMetrics} />
        <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
          {t("No liquidity pools yet. Provide liquidity to start earning trading fees.")}
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
            <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[10%]" />
                <col className="w-[18%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr className="text-left">
                  <th className={cn(HEADER_CLASS, "rounded-l-radius-lg pl-5")}>{t("Pools")}</th>
                  <th className={cn(HEADER_CLASS)}>{t("Status")}</th>
                  <th className={cn(HEADER_CLASS, "text-right")}>{t("Deposited")}</th>
                  <th className={cn(HEADER_CLASS, "text-right")}>{t("APY")}</th>
                  <th className={cn(HEADER_CLASS, "text-right")}>{t("Fees Earned")}</th>
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
                      <PoolIdentity token0={row.token0} token1={row.token1} label={row.poolLabel} protocol={row.protocol} />
                    </td>
                    <td className={cn("py-3.5 pl-4", TABLE_ROW_HOVER_BG)}>
                      <RangeStatus inRange={row.inRange} />
                    </td>
                    <td className={cn("py-3.5 text-right", TABLE_ROW_HOVER_BG)}>
                      <TokenUsdCell token={m(row.depositedToken)} usd={m(exact(row.depositedUsd))} />
                    </td>
                    <td className={cn("py-3.5 text-right text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white", TABLE_ROW_HOVER_BG)}>
                      {row.apyPct.toFixed(2)}%
                    </td>
                    <td className={cn("py-3.5 text-right", TABLE_ROW_HOVER_BG)}>
                      <TokenUsdCell token={m(row.feesEarnedToken)} usd={m(exact(row.feesEarnedUsd))} />
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
                            goClaim(row.marketId)
                          }}
                        >
                          <ActionIcon label="Claim" />
                          {t("Claim")}
                        </Button>
                        <Button
                          type="button"
                          size="table"
                          variant="table-secondary"
                          className="w-auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            goRemove(row.marketId)
                          }}
                        >
                          <ActionIcon label="Remove" />
                          {t("Remove")}
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
          <TradingFeeMobileCard
            key={row.id}
            row={row}
            mask={m}
            exact={exact}
            onClaim={() => goClaim(row.marketId)}
            onRemove={() => goRemove(row.marketId)}
            onOpen={() => router.push(detailHref(row.marketId))}
          />
        ))}
      </div>
    </section>
  )
}

function PoolIdentity({
  token0,
  token1,
  label,
  protocol,
}: {
  token0: string
  token1: string
  label: string
  protocol: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex items-center">
        <TokenIcon symbol={token0} size="table" />
        <span className="-ml-2">
          <TokenIcon symbol={token1} size="table" />
        </span>
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">{label}</span>
        <span className="text-[11px] text-muted-foreground">{protocol}</span>
      </div>
    </div>
  )
}

function RangeStatus({ inRange }: { inRange: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        inRange ? "bg-success/12 text-success" : "bg-amber-500/12 text-amber-600 dark:text-amber-400",
      )}
    >
      <span className={cn("size-1.5 rounded-full", inRange ? "bg-emerald-500" : "bg-amber-500")} />
      {inRange ? t("In range") : t("Out of range")}
    </span>
  )
}

function TokenUsdCell({ token, usd }: { token: string; usd: string }) {
  return (
    <div className="flex flex-col items-end pr-4">
      <span className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">{token}</span>
      <span className="text-[12px] tracking-[-0.03em] text-muted-foreground dark:text-white/40">{usd}</span>
    </div>
  )
}

function TradingFeeMobileCard({
  row,
  mask,
  exact,
  onClaim,
  onRemove,
  onOpen,
}: {
  row: TradingFeeRow
  mask: (v: string) => string
  exact: (usd: number) => string
  onClaim: () => void
  onRemove: () => void
  onOpen: () => void
}) {
  const { t } = useTranslation()
  return (
    <MarketMobileCard clickable className="space-y-2" onClick={onOpen}>
      <MarketMobileCardHeader
        identity={
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex items-center">
              <TokenIcon symbol={row.token0} size="table" />
              <span className="-ml-2">
                <TokenIcon symbol={row.token1} size="table" />
              </span>
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">{row.poolLabel}</div>
              <div className="text-[11px] text-muted-foreground">{row.protocol}</div>
            </div>
          </div>
        }
        metric={<MarketMobileMetric value={`${row.apyPct.toFixed(2)}%`} label="APY" />}
      />
      <MarketMobileStatList>
        <MarketMobileStatRow label={t("Status")} value={<RangeStatus inRange={row.inRange} />} />
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
          label={t("Fees Earned")}
          value={
            <span>
              {mask(row.feesEarnedToken)}
              <span className="ml-2 text-[12px] text-muted-foreground">{mask(exact(row.feesEarnedUsd))}</span>
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
            onClaim()
          }}
        >
          <ActionIcon label="Claim" />
          {t("Claim")}
        </Button>
        <Button
          type="button"
          variant="brand-secondary"
          className="h-10 rounded-radius-sm px-4 text-[13px]"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
        >
          <ActionIcon label="Remove" />
          {t("Remove")}
        </Button>
      </div>
    </MarketMobileCard>
  )
}
