"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { TokenIcon } from "@/app/components/token-icon"
import { TOKENS } from "../lend/components/data"

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function PortfolioInvestments() {
  const { showDollarAmounts } = useDisplayPreferences()

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">My investments</h2>
      </div>

      <Card className="overflow-hidden border-border bg-surface-raised shadow-elev-1">
        <CardContent className="p-0">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="pb-2 pt-3 pl-5">Asset</th>
                  <th className="pb-2 pt-3 text-right">Deposited</th>
                  <th className="pb-2 pt-3 text-right">APY</th>
                  <th className="pb-2 pt-3 pr-5 text-right">Interest earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TOKENS.map((token) => (
                  <tr key={token.symbol} className="cursor-pointer transition-colors hover:bg-surface-inset/60">
                    <td className="py-2.5 pl-5">
                      <div className="flex items-center gap-2.5">
                        <TokenIcon symbol={token.symbol} size="md" />
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-foreground">{token.name}</span>
                          <span className="text-[11px] text-muted-foreground">{token.symbol}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="font-data text-[13px] font-medium tabular-nums text-foreground">
                        {token.symbol === "ETH" ? token.balance.toFixed(3) : token.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} {token.symbol}
                      </div>
                      <div className="font-data text-[11px] tabular-nums text-muted-foreground">
                        {showDollarAmounts ? formatUsd(token.balance * token.price) : "••••••••"}
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="font-data text-[13px] font-medium tabular-nums text-[#01AACF]">{token.apy.toFixed(2)}%</span>
                    </td>
                    <td className="py-2.5 pr-5 text-right">
                      <div className="font-data text-[13px] font-medium tabular-nums text-[#01AACF]">
                        {showDollarAmounts ? `+${formatUsd(token.earned)}` : "••••••••"}
                      </div>
                      <div className="font-data text-[11px] tabular-nums text-muted-foreground">
                        {showDollarAmounts ? `+${token.daily.toFixed(2)} today` : "••••••••"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3.5 md:hidden">
            {TOKENS.map((token) => (
              <div key={token.symbol} className="flex cursor-pointer items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TokenIcon symbol={token.symbol} size="md" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">{token.name}</span>
                    <span className="font-data text-[11px] tabular-nums text-[#01AACF]">{token.apy.toFixed(2)}% APY</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data text-[13px] tabular-nums text-foreground">
                    {token.symbol === "ETH" ? token.balance.toFixed(3) : token.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} {token.symbol}
                  </span>
                  <span className="font-data text-[11px] tabular-nums text-[#01AACF]">
                    {showDollarAmounts ? `+${formatUsd(token.earned)} earned` : "••••••••"}
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
