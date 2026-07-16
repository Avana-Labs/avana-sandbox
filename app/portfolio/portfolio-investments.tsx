"use client"

import { useRouter } from "next/navigation"
import { ActionIcon } from "@/app/components/action-icon"
import { Button } from "@/components/ui/button"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { TokenIcon } from "@/app/components/token-icon"
import type { PortfolioLendTabData, PortfolioSupplyPosition } from "@/app/lib/data/providers/portfolio"
import { formatUsdExact } from "@/app/lib/borrow-sim"
import { getActiveCurrency } from "@/app/lib/currency/active-rate"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"

const MASK = "••••"

function formatClaimableUsd(value: number) {
  const { rate, symbol, zeroDecimal } = getActiveCurrency()
  const digits = zeroDecimal ? 0 : 2
  return `${symbol}${(value * rate).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

function formatTokenAmount(value: number, symbol: string) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
}

function resolveMarketId(token: PortfolioSupplyPosition) {
  return token.marketId ?? token.symbol.toLowerCase()
}

export function PortfolioInvestments({
  investments,
  rewardsSummary,
  onClaimRewards,
  isClaimingRewards = false,
  showHeading = true,
  showIndexColumn = false,
  returnHref,
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
}) {
  const router = useRouter()
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const claimableUsd = rewardsSummary?.claimableUsd ?? 0
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className={showHeading ? "mb-8" : undefined}>
      {showHeading ? (
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">Positions</h2>
            {claimableUsd > 0 ? <p className="mt-1 text-[12px] text-muted-foreground">Claimable rewards</p> : null}
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
            <DesktopTableSurface>
              <table className="w-full min-w-[500px] table-fixed border-separate border-spacing-0 text-[13px]">
                <colgroup>
                  {showIndexColumn ? <col className="w-[6%]" /> : null}
                  <col className={showIndexColumn ? "w-[24%]" : "w-[26%]"} />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className={showIndexColumn ? "w-[36%]" : "w-[40%]"} />
                </colgroup>
                <thead>
                  <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                    {showIndexColumn ? (
                      <th className="rounded-l-radius-lg bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                        #
                      </th>
                    ) : null}
                    <th
                      className={`${showIndexColumn ? "" : "rounded-l-radius-lg"} bg-table-header px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70`}
                    >
                      Asset
                    </th>
                    <th className="bg-table-header px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                      Deposited
                    </th>
                    <th className="bg-table-header px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                      APY
                    </th>
                    <SilentActionHeader className="pr-5" />
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
                          <td
                            className={`py-3.5 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}
                          >
                            {index + 1}
                          </td>
                        ) : null}
                        <td className={`py-3.5 pl-5 ${showIndexColumn ? TABLE_ROW_HOVER_BG : TABLE_ROW_HOVER_LEFT}`}>
                          <div className="flex items-center gap-2.5">
                            <TokenIcon symbol={token.symbol} size="table" />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                                {token.name}
                              </span>
                              <span className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">
                                {token.symbol}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className={`py-3.5 text-right ${TABLE_ROW_HOVER_BG}`}>
                          <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                            {m(formatTokenAmount(token.balance, token.symbol))}
                          </div>
                          <div className="text-[12px] tracking-[-0.03em] text-muted-foreground">
                            {m(formatUsdExact(token.suppliedUsd))}
                          </div>
                        </td>
                        <td className={`py-3.5 text-right ${TABLE_ROW_HOVER_BG}`}>
                          <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                            {token.apyPct.toFixed(2)}%
                          </div>
                          <div className="text-[12px] tracking-[-0.03em] text-muted-foreground">
                            {m(`+${formatUsdExact(token.earnedUsd)}`)}
                          </div>
                        </td>
                        <td className={`py-3.5 pr-5 ${TABLE_ROW_HOVER_RIGHT}`}>
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
                              Deposit
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
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-foreground">{token.name}</div>
                          <div className="text-[11px] text-muted-foreground">{token.symbol}</div>
                        </div>
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
                          <span className="ml-2 text-[12px] tracking-[-0.03em] text-muted-foreground">
                            {m(formatUsdExact(token.suppliedUsd))}
                          </span>
                        </span>
                      }
                    />
                    <MarketMobileStatRow
                      label={t("Earnings")}
                      value={
                        <span>
                          {m(`+${formatUsdExact(token.earnedUsd)}`)}
                          <span className="ml-2 text-[12px] tracking-[-0.03em] text-muted-foreground">
                            {m(`${formatUsdExact(token.dailyEarnedUsd)}/day`)}
                          </span>
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
                        router.push(
                          actionPagePath("lend", "deposit", { market: marketId, return: returnHref ?? detailHref }),
                        )
                      }}
                    >
                      <ActionIcon label="Deposit" />
                      Deposit
                    </Button>
                    <Button
                      type="button"
                      variant="brand-secondary"
                      className="h-10 rounded-radius-sm px-4 text-[13px]"
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
                  </div>
                </MarketMobileCard>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
