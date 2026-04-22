import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TokenIcon } from "@/app/components/token-icon"
import { MARKETS, TOKENS } from "./data"

interface ExploreOpportunitiesProps {
  openDeposit: (token: typeof TOKENS[number] | typeof MARKETS[number]) => void;
}

export function ExploreOpportunities({ openDeposit }: ExploreOpportunitiesProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium">Explore Opportunities</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MARKETS.map(m => (
          <Card key={m.symbol} className={`border-border/40 bg-card/50 shadow-none transition-colors hover:bg-muted/30 cursor-pointer ${m.soon ? 'opacity-60 cursor-default hover:bg-card/50' : ''}`} onClick={() => !m.soon && openDeposit(m)}>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TokenIcon symbol={m.symbol} size="lg" />
                  <div>
                    <div className="font-medium text-sm">{m.symbol}</div>
                    <div className="text-xs text-muted-foreground">{m.protocol}</div>
                  </div>
                </div>
                {!m.soon && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-medium">
                    {m.apy.toFixed(2)}% APY
                  </Badge>
                )}
                {m.soon && (
                  <Badge variant="outline" className="font-medium text-muted-foreground">Soon</Badge>
                )}
              </div>
              
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">TVL</span>
                  <span className="font-data font-medium">{m.tvl}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-muted-foreground text-xs">Utilization</span>
                  <span className="font-data font-medium">{m.soon ? '—' : `${m.utilization}%`}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
