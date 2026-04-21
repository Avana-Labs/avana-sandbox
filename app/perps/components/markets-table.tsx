import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Market = {
  symbol: string
  name: string
  price: number
  funding: number
  change: number
  volume: number
  maxLeverage: number
}

export function MarketsTable({ markets }: { markets: Market[] }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium">Markets</h2>
      </div>
      <Card className="border-border/40 bg-card/50 shadow-none overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground">
                  <th className="pb-3 pt-4 pl-6 font-medium">Asset</th>
                  <th className="pb-3 pt-4 text-right font-medium">Price</th>
                  <th className="pb-3 pt-4 text-right font-medium">24h Change</th>
                  <th className="pb-3 pt-4 text-right font-medium">24h Vol</th>
                  <th className="pb-3 pt-4 pr-6 text-right font-medium">Max Lev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {markets.map((m) => (
                  <tr key={m.symbol} className="transition-colors hover:bg-muted/50">
                    <td className="py-3 pl-6">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.symbol}</span>
                        <span className="text-xs text-muted-foreground">{m.name}</span>
                      </div>
                    </td>
                    <td className="font-data py-3 text-right">${m.price.toLocaleString("en-US")}</td>
                    <td className="py-3 text-right">
                      <span className={`font-data text-xs font-medium ${m.change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {m.change >= 0 ? "+" : ""}{m.change}%
                      </span>
                    </td>
                    <td className="font-data py-3 text-right">${(m.volume / 1000000).toFixed(1)}M</td>
                    <td className="py-3 pr-6 text-right">
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {m.maxLeverage}x
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="space-y-4 md:hidden p-4">
            {markets.map((m) => (
              <div key={m.symbol} className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.symbol}</span>
                    <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground">
                      {m.maxLeverage}x
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data text-sm">${m.price.toLocaleString("en-US")}</span>
                  <span className={`font-data text-xs font-medium ${m.change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {m.change >= 0 ? "+" : ""}{m.change}%
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
