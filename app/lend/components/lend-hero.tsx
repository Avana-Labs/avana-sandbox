import { useId, useMemo, useState } from "react"
import { Eye, EyeOff, ArrowUp, ArrowDown, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { TOKENS, mockChartData } from "./data"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "next-themes"
import { makeChartPalette, type ThemeMode } from "@/app/lib/chart-colors"

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
  const { resolvedTheme } = useTheme()
  const theme: ThemeMode = resolvedTheme === "dark" ? "dark" : "light"
  const gradientId = useId()

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

  const palette = useMemo(
    () => makeChartPalette({ symbols: TOKENS.map((token) => token.symbol), theme }),
    [theme],
  )

  return (
    <>
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          <h2 className="m-0 leading-none">My lending balance</h2>
          <button onClick={() => setShowBalance(!showBalance)} className="hover:text-foreground">
            {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-data text-[22px] font-medium tracking-tight md:text-[28px]">
            {showBalance ? `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "••••••••"}
          </span>
          <span className="font-data text-[12.5px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
            +${(totalEarned * (rangeStats[activeRange as keyof typeof rangeStats]?.earnedFraction || 1)).toFixed(2)} ({rangeStats[activeRange as keyof typeof rangeStats]?.apy.toFixed(2) || "4.18"}%)
          </span>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        
        {/* LEFT: CHART */}
        <div className="flex flex-col h-full w-full">
          <Card className="border-border bg-surface-raised shadow-elev-1 h-full">
            <CardContent className="p-0">
              <div className="h-[260px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayChartData}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={palette.fillTop} />
                        <stop offset="95%" stopColor={palette.fillBottom} />
                      </linearGradient>
                    </defs>
                    <RechartsTooltip
                      cursor={{ stroke: palette.cursor, strokeWidth: 1 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-xs border border-border bg-popover px-2 py-1.5 shadow-elev-2">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                  {payload[0].payload.time}
                                </span>
                                <span className="font-data text-[12.5px] font-medium text-foreground">
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
                      stroke={palette.stroke}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#${gradientId})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: ACTION GRID & STATS */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => openDeposit(TOKENS[0])} className="flex flex-col items-start gap-3 rounded-radius-md border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-500/15">
              <div className="flex h-7 w-7 items-center justify-center rounded-xs border border-emerald-500/25 bg-background/60">
                <ArrowUp className="h-3.5 w-3.5 rotate-45" />
              </div>
              <span className="font-medium text-[13px]">Deposit</span>
            </button>
            <button onClick={() => openWithdraw(TOKENS[0])} className="flex flex-col items-start gap-3 rounded-radius-md border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-500/15">
              <div className="flex h-7 w-7 items-center justify-center rounded-xs border border-emerald-500/25 bg-background/60">
                <ArrowDown className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium text-[13px]">Withdraw</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-px rounded-radius-md border border-border bg-border overflow-hidden">
            <div className="bg-surface-raised p-3.5">
              <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1 flex items-center gap-1.5">
                Average APY <InfoTip text="Weighted average APY across all your deposited assets." />
              </div>
              <div className="font-data text-[18px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{rangeStats[activeRange as keyof typeof rangeStats]?.apy.toFixed(2) || "4.18"}%</div>
            </div>
            <div className="bg-surface-raised p-3.5">
              <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1 flex items-center gap-1.5">
                Interest earned <InfoTip text="Total yield earned from all active positions over time." />
              </div>
              <div className="font-data text-[18px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">+${(totalEarned * (rangeStats[activeRange as keyof typeof rangeStats]?.earnedFraction || 1)).toFixed(2)}</div>
            </div>
          </div>

          <div className="flex gap-1 mt-1 border border-border rounded-xs bg-surface-inset p-0.5">
            {["1H", "1D", "1W", "1M", "1Y", "All"].map(r => (
              <button
                key={r}
                onClick={() => setActiveRange(r)}
                className={`flex-1 rounded-xs px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  activeRange === r 
                    ? "bg-surface-raised text-foreground shadow-elev-1" 
                    : "text-muted-foreground hover:text-foreground"
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
