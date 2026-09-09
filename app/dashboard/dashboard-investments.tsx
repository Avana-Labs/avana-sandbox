"use client"

import { useRouter } from "next/navigation"
import { ActionIcon } from "@/app/components/action-icon"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { Button } from "@/components/ui/button"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileActionFooter,
  MarketMobileCardHeader,
  MarketMobileIdentityText,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
  MarketMobileSupportingValue,
  MARKET_MOBILE_CTA_CLASS,
} from "@/app/components/market-card-primitives"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { TokenIcon } from "@/app/components/token-icon"
import type { PortfolioLendTabData, PortfolioSupplyPosition } from "@/app/lib/data/providers/portfolio"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { LiveInterestEarnedUsd } from "@/app/dashboard/live-accrual"
import { formatUsdExact } from "@/app/lib/borrow-sim"
import { getActiveCurrency } from "@/app/lib/currency/active-rate"
import {
  TABLE_BASE,
  TABLE_CELL_INDEX,
  TABLE_CELL_NUMERIC,
  TABLE_CELL_PADDING,
  TABLE_CELL_PADDING_LEADING,
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
import { cn } from "@/lib/utils"

const MASK = "••••"

function InvestmentsMetricHeader({
  label,
  help,
  align = "left",
}: {
  label: string
  help: string
  align?: "left" | "right"
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", align === "right" && "justify-end")}>
      {formatTableHeaderLabel(label)}
      <ActionMetricHelp topic={label} text={help} />
    </span>
  )
}

function formatClaimableUsd(value: number) {
  const { rate, symbol, zeroDecimal } = getActiveCurrency()
  const digits = zeroDecimal ? 0 : 2
  return `${symbol}${(value * rate).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

function formatTokenAmount(value: number, symbol: string) {
  // Adaptive precision (matches the wallet Tokens table): more decimals for small
  // balances so `amount × unit price` reconciles with the USD line instead of losing
  // a few dollars to a hard 2-decimal round on high-unit-price tokens like weETH.
  const maximumFractionDigits = value >= 100 ? 2 : value >= 1 ? 4 : 6
  return `${value.toLocaleString("en-US", { maximumFractionDigits })} ${symbol}`
}

function resolveMarketId(token: PortfolioSupplyPosition) {
  return token.marketId ?? token.symbol.toLowerCase()
}

/**
 * Asset second line: the live unit price, falling back to the symbol when the
 * oracle has none — identical to the lend markets table (`AssetSubLabel`), so
 * this dashboard table matches it for ANY onboarded token, priced or not.
 */
function AssetPriceSubLabel({ symbol }: { symbol: string }) {
  const priceFor = useCanonicalPriceFor()
  const price = priceFor(symbol)
  return <>{price !== undefined ? formatTokenPrice(price) : symbol}</>
}

/**
 * Per-asset interest earned. When `anchorMs` is provided it accrues in real time at
 * this position's own rate (suppliedUsd × APY) from the supply moment — so the column
 * ticks live and the rows sum exactly to the "Interest Earned" metric on Lend Balance
 * (whose rate is totalSupplied × net-APY = Σ suppliedᵢ × apyᵢ). Falls back to the
 * static ledger value when no anchor is passed (interest excludes protocol rewards).
 */
function EarnedCell({
  token,
  anchorMs,
  show,
  className,
}: {
  token: PortfolioSupplyPosition
  anchorMs: number | null | undefined
  show: boolean
  className?: string
}) {
  if (!show) return <span className={className}>{MASK}</span>
  const baseUsd = token.interestUsd ?? token.earnedUsd
  if (anchorMs === undefined) return <span className={className}>+{formatUsdExact(baseUsd)}</span>
  return (
    <span className={className}>
      +
      <LiveInterestEarnedUsd
        anchorMs={anchorMs}
        ratePerYearUsd={(token.suppliedUsd * token.apyPct) / 100}
        baseUsd={baseUsd}
        fractionDigits={4}
      />
    </span>
  )
}

export function DashboardInvestments({
  investments,
  rewardsSummary,
  onClaimRewards,
  isClaimingRewards = false,
  showHeading = true,
  showIndexColumn = false,
  returnHref,
  title = "Assets",
  countLabel,
  accrualSinceMs,
}: {
  investments: PortfolioSupplyPosition[]
  rewardsSummary?: PortfolioLendTabData["rewardsSummary"]
  onClaimRewards?: () => void
  isClaimingRewards?: boolean
  showHeading?: boolean
  showIndexColumn?: boolean
  // Where the action flow's close button should land. Defaults to the market
  // detail page; the dashboard passes its own URL so closing returns you here.
  returnHref?: string
  title?: string
  countLabel?: string
  // When set, the Earned column accrues live from this supply-start anchor (see
  // EarnedCell). Omit to keep the static ledger value.
  accrualSinceMs?: number | null
}) {
  const router = useRouter()
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const claimableUsd = rewardsSummary?.claimableUsd ?? 0
  const m = (value: string) => (showDollarAmounts ? value : MASK)
  // `suppliedUsd` is already valued at the live oracle price upstream (LendAccountSection),
  // so the Deposited column, "Total Supplied" and the interest accrual all read the same
  // number — the table sums exactly to the headline.

  return (
    <section className={showHeading ? "mb-8" : undefined}>
      {showHeading ? (
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">{title}</h2>
            {countLabel ? <p className="mt-1 text-[13px] text-muted-foreground">{countLabel}</p> : null}
          </div>
          {claimableUsd > 0 && onClaimRewards ? (
            <Button type="button" size="sm" disabled={isClaimingRewards} onClick={onClaimRewards}>
              {isClaimingRewards ? "Claiming..." : `Claim ${formatClaimableUsd(claimableUsd)}`}
            </Button>
          ) : null}
        </div>
      ) : claimableUsd > 0 && onClaimRewards ? (
        <div className="mb-3 flex justify-end">
          <Button type="button" size="sm" disabled={isClaimingRewards} onClick={onClaimRewards}>
            {isClaimingRewards ? "Claiming..." : `Claim ${formatClaimableUsd(claimableUsd)}`}
          </Button>
        </div>
      ) : null}

      {investments.length === 0 ? (
        <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
          No lending positions yet. Supply assets to start earning yield.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <DesktopTableSurface className="!rounded-none">
              <table className={`w-full min-w-[640px] table-fixed border-separate border-spacing-0 ${TABLE_BASE}`}>
                <colgroup>
                  {showIndexColumn ? <col className="w-[6%]" /> : null}
                  <col className={showIndexColumn ? "w-[24%]" : "w-[26%]"} />
                  <col className="w-[22%]" />
                  <col className="w-[16%]" />
                  <col className={showIndexColumn ? "w-[32%]" : "w-[36%]"} />
                </colgroup>
                <thead>
                  <tr className={TABLE_HEADER_ROW}>
                    {showIndexColumn ? <th className={cn(TABLE_HEADER_CELL, "px-4 text-left")}>#</th> : null}
                    <th className={cn(TABLE_HEADER_CELL, "px-5 text-left")}>
                      <InvestmentsMetricHeader
                        label={t("Asset")}
                        help={t("The token you've supplied to earn lending yield.")}
                      />
                    </th>
                    <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>
                      <InvestmentsMetricHeader
                        label={t("Deposited")}
                        help={t("Your supplied balance in this asset, valued at its live price.")}
                        align="right"
                      />
                    </th>
                    <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>
                      <InvestmentsMetricHeader
                        label={t("APY")}
                        help={t("Current annual percentage yield on your deposit, before protocol rewards.")}
                        align="right"
                      />
                    </th>
                    <SilentActionHeader className="!rounded-none pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-white/6">
                  {investments.map((token, index) => {
                    const marketId = resolveMarketId(token)
                    const detailHref = `/lend/markets/${marketId}`
                    return (
                      <tr
                        key={token.id}
                        className="group cursor-pointer transition-colors"
                        onClick={() => router.push(detailHref)}
                      >
                        {showIndexColumn ? (
                          <td className={cn(TABLE_CELL_PADDING_LEADING, TABLE_CELL_INDEX, TABLE_ROW_HOVER_LEFT)}>
                            {index + 1}
                          </td>
                        ) : null}
                        <td
                          className={cn(
                            TABLE_CELL_PADDING,
                            "pl-5",
                            showIndexColumn ? TABLE_ROW_HOVER_BG : TABLE_ROW_HOVER_LEFT,
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <TokenIcon symbol={token.symbol} size="table" />
                            <div className="flex min-w-0 flex-col">
                              <span className={cn("truncate", TABLE_CELL_PRIMARY)}>{token.name}</span>
                              <span className={cn(TABLE_CELL_SECONDARY, "tabular-nums")}>
                                <AssetPriceSubLabel symbol={token.symbol} />
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className={cn(TABLE_CELL_PADDING, "text-right", TABLE_ROW_HOVER_BG)}>
                          <div className={TABLE_CELL_NUMERIC}>{m(formatTokenAmount(token.balance, token.symbol))}</div>
                          <div className={TABLE_CELL_SECONDARY}>{m(formatUsdExact(token.suppliedUsd))}</div>
                        </td>
                        <td className={cn(TABLE_CELL_PADDING, "text-right", TABLE_ROW_HOVER_BG)}>
                          <div className={TABLE_CELL_NUMERIC}>{token.apyPct.toFixed(2)}%</div>
                          <EarnedCell
                            token={token}
                            anchorMs={accrualSinceMs}
                            show={showDollarAmounts}
                            className={cn(TABLE_CELL_SECONDARY, "text-success")}
                          />
                        </td>
                        <td className={cn(TABLE_CELL_PADDING_TRAILING, TABLE_ROW_HOVER_RIGHT)}>
                          <HoverActionGroup className="justify-end gap-2">
                            <Button
                              type="button"
                              size="table"
                              variant="table-primary"
                              className="w-auto"
                              onClick={(event) => {
                                event.stopPropagation()
                                router.push(
                                  actionPagePath("lend", "deposit", {
                                    market: marketId,
                                    return: returnHref ?? detailHref,
                                  }),
                                )
                              }}
                            >
                              <ActionIcon label="Deposit" />
                              Add
                            </Button>
                            <Button
                              type="button"
                              size="table"
                              variant="table-secondary"
                              className="w-auto"
                              onClick={(event) => {
                                event.stopPropagation()
                                router.push(
                                  actionPagePath("lend", "withdraw", {
                                    market: marketId,
                                    return: returnHref ?? detailHref,
                                  }),
                                )
                              }}
                            >
                              <ActionIcon label="Withdraw" />
                              Withdraw
                            </Button>
                          </HoverActionGroup>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </DesktopTableSurface>
          </div>

          <div className="space-y-3 md:hidden">
            {investments.map((token) => {
              const marketId = resolveMarketId(token)
              const detailHref = `/lend/markets/${marketId}`
              return (
                <MarketMobileCard
                  key={token.id}
                  clickable
                  className="space-y-2"
                  onClick={() => router.push(detailHref)}
                >
                  <MarketMobileCardHeader
                    identity={
                      <div className="flex min-w-0 items-center gap-2.5">
                        <TokenIcon symbol={token.symbol} size="table" />
                        <MarketMobileIdentityText
                          title={token.name}
                          subtitle={<AssetPriceSubLabel symbol={token.symbol} />}
                        />
                      </div>
                    }
                    metric={<MarketMobileMetric value={`${token.apyPct.toFixed(2)}%`} label="APY" />}
                  />
                  <MarketMobileStatList>
                    <MarketMobileStatRow
                      label={t("Deposited")}
                      value={
                        <span>
                          {m(formatTokenAmount(token.balance, token.symbol))}
                          <MarketMobileSupportingValue>
                            {m(formatUsdExact(token.suppliedUsd))}
                          </MarketMobileSupportingValue>
                        </span>
                      }
                    />
                    <MarketMobileStatRow
                      label={t("Earnings")}
                      value={
                        <span>
                          <EarnedCell
                            token={token}
                            anchorMs={accrualSinceMs}
                            show={showDollarAmounts}
                            className="text-success"
                          />
                          <MarketMobileSupportingValue>
                            {m(`${formatUsdExact(token.dailyEarnedUsd)}/day`)}
                          </MarketMobileSupportingValue>
                        </span>
                      }
                      valueClassName="text-success"
                    />
                  </MarketMobileStatList>
                  <MarketMobileActionFooter>
                    <Button
                      type="button"
                      variant="brand"
                      className={MARKET_MOBILE_CTA_CLASS}
                      onClick={(event) => {
                        event.stopPropagation()
                        router.push(
                          actionPagePath("lend", "deposit", { market: marketId, return: returnHref ?? detailHref }),
                        )
                      }}
                    >
                      <ActionIcon label="Deposit" />
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="brand-secondary"
                      className={MARKET_MOBILE_CTA_CLASS}
                      onClick={(event) => {
                        event.stopPropagation()
                        router.push(
                          actionPagePath("lend", "withdraw", { market: marketId, return: returnHref ?? detailHref }),
                        )
                      }}
                    >
                      <ActionIcon label="Withdraw" />
                      Withdraw
                    </Button>
                  </MarketMobileActionFooter>
                </MarketMobileCard>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
