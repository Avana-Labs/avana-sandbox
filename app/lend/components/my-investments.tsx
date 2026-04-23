import { Card, CardContent } from "@/components/ui/card"
import { TokenIcon } from "@/app/components/token-icon"
import { TOKENS } from "./data"

interface MyInvestmentsProps {
  openDeposit: (token: typeof TOKENS[number]) => void;
}

export function MyInvestments({ openDeposit }: MyInvestmentsProps) {
  return (
    <div className="mb-10">
      <div className="mb-3">
        <h2 className="text-[14px] font-medium tracking-tight text-foreground">My investments</h2>
      </div>
      <Card className="border-border bg-surface-raised shadow-elev-1 overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table */}
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
                {TOKENS.map(t => (
                  <tr key={t.symbol} className="transition-colors hover:bg-surface-inset/60 cursor-pointer" onClick={() => openDeposit(t)}>
                    <td className="py-2.5 pl-5">
                      <div className="flex items-center gap-2.5">
                        <TokenIcon symbol={t.symbol} size="md" />
                        <div className="flex flex-col">
                          <span className="font-medium text-[13px] text-foreground">{t.name}</span>
                          <span className="text-[11px] text-muted-foreground">{t.symbol}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="font-data text-[13px] font-medium tabular-nums text-foreground">{t.symbol === "ETH" ? t.balance.toFixed(3) : t.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} {t.symbol}</div>
                      <div className="font-data text-[11px] tabular-nums text-muted-foreground">${(t.balance * t.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="font-data text-[13px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{t.apy.toFixed(2)}%</span>
                    </td>
                    <td className="py-2.5 pr-5 text-right">
                      <div className="font-data text-[13px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">+${t.earned.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                      <div className="font-data text-[11px] tabular-nums text-muted-foreground">+${t.daily.toFixed(2)} today</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="space-y-3 md:hidden p-3.5">
            {TOKENS.map((t) => (
              <div key={t.symbol} className="flex items-center justify-between cursor-pointer" onClick={() => openDeposit(t)}>
                <div className="flex items-center gap-2.5">
                  <TokenIcon symbol={t.symbol} size="md" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">{t.name}</span>
                    <span className="font-data text-[11px] tabular-nums text-emerald-600 dark:text-emerald-400">{t.apy.toFixed(2)}% APY</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data text-[13px] tabular-nums text-foreground">{t.symbol === "ETH" ? t.balance.toFixed(3) : t.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} {t.symbol}</span>
                  <span className="font-data text-[11px] tabular-nums text-emerald-600 dark:text-emerald-400">
                    +${t.earned.toLocaleString("en-US", { minimumFractionDigits: 2 })} earned
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
