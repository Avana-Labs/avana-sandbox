import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TokenIcon } from "@/app/components/token-icon"
import { BipolarBar, DeltaPill, FlashValue } from "@/app/components/ui/live"
import { MARKETS, TOKENS } from "./data"

interface ExploreOpportunitiesProps {
  openDeposit: (token: typeof TOKENS[number] | typeof MARKETS[number]) => void;
}

export function ExploreOpportunities({ openDeposit }: ExploreOpportunitiesProps) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-[14px] font-medium tracking-tight text-foreground">Explore opportunities</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MARKETS.map(m => {
          const borrowed = m.utilization
          const available = Math.max(0, 100 - borrowed)
          return (
            <Card
              key={m.symbol}
              className={`border-border bg-surface-raised shadow-elev-1 transition-colors hover:bg-surface-inset cursor-pointer ${m.soon ? "opacity-60 cursor-default hover:bg-surface-raised" : ""}`}
              onClick={() => !m.soon && openDeposit(m)}
            >
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <TokenIcon symbol={m.symbol} size="md" />
                    <div>
                      <div className="font-medium text-[13px] text-foreground">{m.symbol}</div>
                      <div className="text-[11px] text-muted-foreground">{m.protocol}</div>
                    </div>
                  </div>
                  {m.soon ? (
                    <Badge variant="outline" className="font-medium text-muted-foreground">Soon</Badge>
                  ) : m.event ? (
                    <Badge variant="secondary" className="rounded-xs bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 font-medium text-[10px] uppercase tracking-[0.06em]">
                      {m.event}
                    </Badge>
                  ) : null}
                </div>

                {!m.soon ? (
                  <>
                    <div className="mt-4 flex items-end justify-between gap-2">
                      <div>
                        <FlashValue
                          value={m.apy}
                          goodDirection="up"
                          className="font-data text-[28px] font-medium leading-none tabular-nums text-emerald-600 dark:text-emerald-400"
                        >
                          {m.apy.toFixed(2)}
                          <span className="ml-0.5 text-[18px]">%</span>
                        </FlashValue>
                        <div className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">APY</div>
                      </div>
                      <DeltaPill value={m.apyChange24h} format="percent" digits={2} label="24h" />
                    </div>

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-muted-foreground">
                        <span>Utilization</span>
                        <span>TVL <span className="font-data font-medium text-foreground">{m.tvl}</span></span>
                      </div>
                      <BipolarBar
                        leftValue={borrowed}
                        rightValue={available}
                        leftLabel={`Borrowed ${borrowed}%`}
                        rightLabel={`Idle ${available}%`}
                        leftClass={borrowed >= 85 ? "bg-rose-500" : borrowed >= 60 ? "bg-amber-500" : "bg-emerald-500"}
                        rightClass="bg-muted-foreground/20"
                        leftLabelClass={borrowed >= 85 ? "text-rose-600" : borrowed >= 60 ? "text-amber-600" : "text-emerald-600"}
                        rightLabelClass="text-muted-foreground"
                        heightClass="h-1.5"
                      />
                    </div>
                  </>
                ) : (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">TVL</span>
                      <span className="font-data text-[13px] font-medium text-foreground">{m.tvl}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Utilization</span>
                      <span className="font-data text-[13px] font-medium text-foreground">—</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
