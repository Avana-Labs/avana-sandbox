import { useMemo, useState } from "react"
import { Eye, EyeOff, ArrowUp, ArrowDown, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { TOKENS, mockChartData } from "./data"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="inline h-3.5 w-3.5 cursor-help text-muted-foreground/60" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface LendHeroProps {
  totalValue: number;
  totalEarned: number;
  openDeposit: (token: typeof TOKENS[number]) => void;
  openWithdraw: (token: typeof TOKENS[number]) => void;
}

export function LendHero({ totalValue, totalEarned, openDeposit, openWithdraw }: LendHeroProps) {
  const [activeRange, setActiveRange] = useState("1D")
  const [showBalance, setShowBalance] = useState(true)

  const rangeStats = useMemo(() => ({
    "1H": { apy: 4.50, earnedFraction: 0.001 },
    "1D": { apy: 4.52, earnedFraction: 0.025 },
    "1W": { apy: 4.51, earnedFraction: 0.15 },
    "1M": { apy: 4.55, earnedFraction: 0.4 },
    "1Y": { apy: 4.48, earnedFraction: 0.8 },
    "All": { apy: 4.18, earnedFraction: 1 },
  }), [])

  const displayChartData = useMemo(() => {
    // Generate a deterministic but different chart based on activeRange for demonstration
    const multiplier = activeRange === '1H' ? 0.98 : activeRange === '1W' ? 1.05 : activeRange === '1M' ? 0.9 : activeRange === '1Y' ? 0.8 : activeRange === 'All' ? 0.7 : 1
    return mockChartData.map(d => ({
      ...d,
      value: d.value * multiplier * (1 + (Math.random() * 0.02 - 0.01))
    }))
  }, [activeRange])

  return (
    <>
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2 text-[12px] font-medium tracking-tight text-muted-foreground">
          <h2 className="m-0 leading-none">My Lending Balance</h2>
          <button onClick={() => setShowBalance(!showBalance)} className="hover:text-foreground">
            {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-data text-[1.45rem] font-semibold tracking-tight md:text-[1.8rem]">
            {showBalance ? `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "••••••••"}
          </span>
          <span className="text-sm font-medium text-emerald-500">
            +${(totalEarned * (rangeStats[activeRange as keyof typeof rangeStats]?.earnedFraction || 1)).toFixed(2)} ({rangeStats[activeRange as keyof typeof rangeStats]?.apy.toFixed(2) || "4.18"}%)
          </span>
        </div>
      </div>

      <div className="mb-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        
        {/* LEFT: CHART */}
        <div className="flex flex-col h-full w-full">
          <Card className="border-border/40 bg-card/50 shadow-none h-full">
            <CardContent className="p-0">
              <div className="h-[260px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayChartData}>
                    <defs>
                      <linearGradient id="colorValueHero" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border border-border bg-background p-2 shadow-sm">
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-muted-foreground">
                                  {payload[0].payload.time}
                                </span>
                                <span className="font-data font-medium">
                                  ${payload[0].value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValueHero)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: ACTION GRID & STATS */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => openDeposit(TOKENS[0])} className="flex flex-col items-start gap-3 rounded-2xl bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/50">
                <ArrowUp className="h-4 w-4 rotate-45" />
              </div>
              <span className="font-medium text-sm">Deposit</span>
            </button>
            <button onClick={() => openWithdraw(TOKENS[0])} className="flex flex-col items-start gap-3 rounded-2xl bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/50">
                <ArrowDown className="h-4 w-4" />
              </div>
              <span className="font-medium text-sm">Withdraw</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-px rounded-2xl border border-border/40 bg-border/40 overflow-hidden">
            <div className="bg-background p-4">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                Average APY <InfoTip text="Weighted average APY across all your deposited assets." />
              </div>
              <div className="font-data text-xl font-medium text-emerald-500">{rangeStats[activeRange as keyof typeof rangeStats]?.apy.toFixed(2) || "4.18"}%</div>
            </div>
            <div className="bg-background p-4">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                Interest Earned <InfoTip text="Total yield earned from all active positions over time." />
              </div>
              <div className="font-data text-xl font-medium text-emerald-500">+${(totalEarned * (rangeStats[activeRange as keyof typeof rangeStats]?.earnedFraction || 1)).toFixed(2)}</div>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            {["1H", "1D", "1W", "1M", "1Y", "All"].map(r => (
              <button
                key={r}
                onClick={() => setActiveRange(r)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  activeRange === r 
                    ? "bg-secondary text-foreground" 
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
