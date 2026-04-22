import { Card, CardContent } from "@/components/ui/card"
import { TokenIcon } from "@/app/components/token-icon"
import { TOKENS } from "./data"

interface MyInvestmentsProps {
  openDeposit: (token: typeof TOKENS[number]) => void;
}

export function MyInvestments({ openDeposit }: MyInvestmentsProps) {
  return (
    <div className="mb-12">
      <div className="mb-4">
        <h2 className="text-lg font-medium">My Investments</h2>
      </div>
      <Card className="border-border/40 bg-card/50 shadow-none overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground">
                  <th className="pb-3 pt-4 pl-6 font-medium">Asset</th>
                  <th className="pb-3 pt-4 text-right font-medium">Deposited</th>
                  <th className="pb-3 pt-4 text-right font-medium">APY</th>
                  <th className="pb-3 pt-4 pr-6 text-right font-medium">Interest Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {TOKENS.map(t => (
                  <tr key={t.symbol} className="transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => openDeposit(t)}>
                    <td className="py-3 pl-6">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={t.symbol} size="lg" />
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{t.name}</span>
                          <span className="text-xs text-muted-foreground">{t.symbol}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="font-data font-medium text-foreground">{t.symbol === "ETH" ? t.balance.toFixed(3) : t.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} {t.symbol}</div>
                      <div className="font-data text-xs text-muted-foreground">${(t.balance * t.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-data font-medium text-emerald-500">{t.apy.toFixed(2)}%</span>
                    </td>
                    <td className="py-3 pr-6 text-right">
                      <div className="font-data font-medium text-emerald-500">+${t.earned.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                      <div className="font-data text-xs text-muted-foreground">+${t.daily.toFixed(2)} today</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="space-y-4 md:hidden p-4">
            {TOKENS.map((t) => (
              <div key={t.symbol} className="flex items-center justify-between cursor-pointer" onClick={() => openDeposit(t)}>
                <div className="flex items-center gap-3">
                  <TokenIcon symbol={t.symbol} size="md" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="font-data text-xs text-emerald-500">{t.apy.toFixed(2)}% APY</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data text-sm text-foreground">{t.symbol === "ETH" ? t.balance.toFixed(3) : t.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} {t.symbol}</span>
                  <span className="font-data text-xs text-emerald-500">
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
