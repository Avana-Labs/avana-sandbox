"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { TokenIcon } from "@/app/components/token-icon"
import type { PortfolioLendTabData, PortfolioSupplyPosition } from "@/app/lib/data/providers/portfolio"

const MASK = "••••"

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTokenAmount(value: number, symbol: string) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${symbol}`
}

function resolveWalletBalance(
  token: PortfolioSupplyPosition,
  walletBalancesBySymbol?: Record<string, number>,
) {
  if (token.walletBalance != null) return token.walletBalance
  return walletBalancesBySymbol?.[token.symbol.toUpperCase()] ?? 0
}

export function PortfolioInvestments({
  investments,
  rewardsSummary,
  walletBalancesBySymbol,
  onClaimRewards,
  isClaimingRewards = false,
  showHeading = true,
}: {
  investments: PortfolioSupplyPosition[]
  rewardsSummary?: PortfolioLendTabData["rewardsSummary"]
  walletBalancesBySymbol?: Record<string, number>
  onClaimRewards?: () => void
  isClaimingRewards?: boolean
  showHeading?: boolean
}) {
  const { showDollarAmounts } = useDisplayPreferences()
  const claimableUsd = rewardsSummary?.claimableUsd ?? 0
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className={showHeading ? "mb-8" : undefined}>
      {showHeading ? (
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">Positions</h2>
            {claimableUsd > 0 ? (
              <p className="mt-1 text-[12px] text-muted-foreground">Claimable rewards</p>
            ) : null}
          </div>
          {claimableUsd > 0 && onClaimRewards ? (
            <Button type="button" size="sm" disabled={isClaimingRewards} onClick={onClaimRewards}>
              {isClaimingRewards ? "Claiming..." : `Claim ${formatUsd(claimableUsd)}`}
            </Button>
          ) : null}
        </div>
      ) : claimableUsd > 0 && onClaimRewards ? (
        <div className="mb-3 flex justify-end">
          <Button type="button" size="sm" disabled={isClaimingRewards} onClick={onClaimRewards}>
            {isClaimingRewards ? "Claiming..." : `Claim ${formatUsd(claimableUsd)}`}
          </Button>
        </div>
      ) : null}

      {investments.length === 0 ? (
        <div className="rounded-radius-md border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
          No lending positions yet. Supply assets to start earning yield.
        </div>
      ) : (
        <Card className="overflow-hidden rounded-radius-md border-0 bg-transparent shadow-none">
          <CardContent className="p-0">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0 text-[13px]">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[18%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[24%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                    <th className="rounded-l-2xl bg-table-header px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Markets
                    </th>
                    <th className="bg-table-header px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Wallet Balance
                    </th>
                    <th className="bg-table-header px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Deposited
                    </th>
                    <th className="bg-table-header px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Deposit APY
                    </th>
                    <th className="rounded-r-2xl bg-table-header px-4 py-3.5 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Earnings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-white/6">
                  {investments.map((token) => {
                    const walletBalance = resolveWalletBalance(token, walletBalancesBySymbol)
                    return (
                      <tr key={token.id} className="transition-colors hover:bg-slate-100 dark:hover:bg-card/5">
                        <td className="py-3.5 pl-5">
                          <div className="flex items-center gap-2.5">
                            <TokenIcon symbol={token.symbol} size="table" />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-[13px] font-medium text-foreground">{token.name}</span>
                              <span className="text-[11px] text-muted-foreground">{token.symbol}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="font-data text-[13px] font-medium tabular-nums text-foreground">
                            {m(formatTokenAmount(walletBalance, token.symbol))}
                          </div>
                          <div className="font-data text-[11px] tabular-nums text-muted-foreground">
                            {m(formatUsd(walletBalance * token.priceUsd))}
                          </div>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="font-data text-[13px] font-medium tabular-nums text-foreground">
                            {m(formatTokenAmount(token.balance, token.symbol))}
                          </div>
                          <div className="font-data text-[11px] tabular-nums text-muted-foreground">
                            {m(formatUsd(token.suppliedUsd))}
                          </div>
                        </td>
                        <td className="py-3.5 text-right">
                          <span className="font-data text-[13px] font-medium tabular-nums text-foreground">
                            {token.apyPct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3.5 pr-5 text-right">
                          <div className="font-data text-[13px] font-medium tabular-nums text-foreground">
                            {m(`+${formatUsd(token.earnedUsd)}`)}
                          </div>
                          <div className="font-data text-[11px] tabular-nums text-muted-foreground">
                            {m(`+${formatUsd(token.dailyEarnedUsd)} today`)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3.5 md:hidden">
              {investments.map((token) => {
                const walletBalance = resolveWalletBalance(token, walletBalancesBySymbol)
                return (
                  <div key={token.id} className="space-y-2 border-b border-border pb-3 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <TokenIcon symbol={token.symbol} size="table" />
                        <div>
                          <div className="text-[13px] font-medium text-foreground">{token.name}</div>
                          <div className="text-[11px] text-muted-foreground">{token.symbol}</div>
                        </div>
                      </div>
                      <span className="font-data text-[13px] tabular-nums text-foreground">{token.apyPct.toFixed(2)}% APY</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <dt className="text-muted-foreground">Wallet</dt>
                        <dd className="font-data tabular-nums text-foreground">{m(formatTokenAmount(walletBalance, token.symbol))}</dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-muted-foreground">Deposited</dt>
                        <dd className="font-data tabular-nums text-foreground">{m(formatTokenAmount(token.balance, token.symbol))}</dd>
                      </div>
                      <div className="col-span-2 text-right">
                        <dt className="text-muted-foreground">Earnings</dt>
                        <dd className="font-data tabular-nums text-foreground">{m(`+${formatUsd(token.earnedUsd)}`)}</dd>
                      </div>
                    </dl>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
