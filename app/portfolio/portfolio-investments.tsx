"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { TokenIcon } from "@/app/components/token-icon"
import type { PortfolioSupplyPosition } from "@/app/lib/data/providers/portfolio"

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function PortfolioInvestments({ investments }: { investments: PortfolioSupplyPosition[] }) {
  const { showDollarAmounts } = useDisplayPreferences()

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">Positions</h2>
      </div>

      <Card className="overflow-hidden rounded-[18px] border-0 bg-white shadow-none dark:bg-slate-950">
        <CardContent className="p-0">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[35%]" />
                <col className="w-[22%]" />
                <col className="w-[13%]" />
                <col className="w-[25%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                  <th className="rounded-l-2xl bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                    #
                  </th>
                  <th className="bg-slate-50 px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                    Asset
                  </th>
                  <th className="bg-slate-50 px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                    Deposited
                  </th>
                  <th className="bg-slate-50 px-4 py-3.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                    APY
                  </th>
                  <th className="rounded-r-2xl bg-slate-50 px-4 py-3.5 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                    Interest earned
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-white/6">
                {investments.map((token, index) => (
                  <tr key={token.id} className="cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-white/5">
                    <td className="py-3 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52">
                      {index + 1}
                    </td>
                    <td className="py-3 pl-5">
                      <div className="flex items-center gap-2.5">
                        <TokenIcon symbol={token.symbol} size="md" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[13px] font-medium text-foreground">{token.name}</span>
                          <span className="text-[11px] text-muted-foreground">{token.symbol}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="font-data text-[13px] font-medium tabular-nums text-foreground">
                        {token.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} {token.symbol}
                      </div>
                      <div className="font-data text-[11px] tabular-nums text-muted-foreground">
                        {showDollarAmounts ? formatUsd(token.balance * token.priceUsd) : "••••••••"}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-data text-[13px] font-medium tabular-nums text-[#01AACF]">{token.apyPct.toFixed(2)}%</span>
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <div className="font-data text-[13px] font-medium tabular-nums text-[#01AACF]">
                        {showDollarAmounts ? `+${formatUsd(token.earnedUsd)}` : "••••••••"}
                      </div>
                      <div className="font-data text-[11px] tabular-nums text-muted-foreground">
                        {showDollarAmounts ? `+${token.dailyEarnedUsd.toFixed(2)} today` : "••••••••"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3.5 md:hidden">
            {investments.map((token) => (
              <div key={token.id} className="flex cursor-pointer items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TokenIcon symbol={token.symbol} size="md" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">{token.name}</span>
                    <span className="font-data text-[11px] tabular-nums text-[#01AACF]">{token.apyPct.toFixed(2)}% APY</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data text-[13px] tabular-nums text-foreground">
                    {token.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} {token.symbol}
                  </span>
                  <span className="font-data text-[11px] tabular-nums text-[#01AACF]">
                    {showDollarAmounts ? `+${formatUsd(token.earnedUsd)} earned` : "••••••••"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
