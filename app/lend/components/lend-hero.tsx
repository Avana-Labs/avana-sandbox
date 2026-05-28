import { useMemo, useState } from "react"
import { ArrowUp, ArrowDown, Info } from "lucide-react"
import { ResponsiveContainer, Line, LineChart, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"
import { TOKENS } from "./data"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useDisplayPreferences } from "@/app/components/display-preferences"

const CHART_STROKE = "hsl(var(--brand))"

const RANGE_DATA = {
  "1D": [99, 97, 96, 94, 95, 93, 82, 79, 63, 61, 66, 83, 66, 88, 84, 90, 92, 91, 98, 84, 69, 78, 79, 85, 85, 90, 82, 80, 74, 72, 73, 64, 75, 75, 80, 80, 83, 76, 77, 76, 81, 78, 79, 77, 72, 81, 81, 81, 77, 82, 84, 86, 87, 82, 84, 79, 72, 67, 65, 52, 46, 49, 41],
  "1W": [103, 102, 100, 97, 98, 95, 88, 84, 73, 71, 76, 90, 76, 93, 90, 95, 97, 96, 101, 93, 79, 87, 88, 92, 93, 96, 91, 89, 84, 82, 83, 76, 86, 86, 90, 90, 93, 86, 87, 86, 91, 88, 89, 87, 83, 91, 91, 91, 87, 92, 95, 97, 98, 94, 96, 91, 85, 80, 78, 67, 61, 63, 57],
  "1M": [108, 106, 104, 102, 103, 101, 95, 91, 82, 79, 84, 98, 84, 99, 96, 101, 103, 102, 107, 96, 85, 92, 94, 98, 99, 102, 97, 96, 91, 89, 90, 84, 93, 93, 96, 97, 100, 93, 94, 93, 97, 95, 96, 94, 90, 97, 98, 98, 95, 99, 102, 104, 105, 101, 103, 98, 92, 88, 85, 75, 69, 71, 66],
  "3M": [116, 113, 111, 108, 109, 106, 100, 96, 86, 83, 88, 102, 89, 103, 100, 105, 107, 106, 110, 101, 91, 98, 99, 102, 104, 106, 101, 99, 94, 92, 93, 87, 96, 97, 100, 101, 104, 98, 99, 98, 102, 100, 101, 99, 95, 103, 103, 103, 100, 104, 107, 109, 110, 107, 108, 103, 97, 92, 90, 81, 75, 77, 71],
  "1Y": [132, 128, 125, 121, 122, 119, 114, 109, 98, 95, 101, 117, 103, 118, 115, 121, 123, 122, 127, 117, 105, 113, 114, 118, 119, 122, 117, 115, 110, 109, 110, 104, 113, 113, 116, 117, 120, 113, 114, 114, 118, 116, 116, 115, 110, 118, 118, 118, 114, 119, 122, 124, 125, 121, 123, 117, 111, 106, 103, 93, 86, 88, 82],
  "ALL": [142, 139, 136, 132, 133, 130, 123, 118, 107, 103, 109, 126, 110, 127, 123, 129, 131, 130, 135, 124, 112, 120, 122, 126, 127, 130, 126, 123, 118, 116, 117, 110, 121, 121, 124, 124, 128, 121, 122, 121, 126, 123, 124, 122, 117, 126, 126, 126, 122, 127, 130, 132, 133, 129, 130, 125, 118, 113, 110, 100, 93, 95, 89],
} as const

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
  const { showDollarAmounts } = useDisplayPreferences()

  const rangeStats = useMemo(() => ({
    "1D": { apy: 4.52, earnedFraction: 0.025, changeUsd: 312.96, changePct: 3.8 },
    "1W": { apy: 4.51, earnedFraction: 0.15, changeUsd: 198.44, changePct: 2.46 },
    "1M": { apy: 4.55, earnedFraction: 0.4, changeUsd: 428.12, changePct: 5.12 },
    "3M": { apy: 4.57, earnedFraction: 0.55, changeUsd: 582.31, changePct: 7.04 },
    "1Y": { apy: 4.48, earnedFraction: 0.8, changeUsd: 917.48, changePct: 11.84 },
    "ALL": { apy: 4.18, earnedFraction: 1, changeUsd: 1342.7, changePct: 16.92 },
  }), [])

  const displayChartData = useMemo(() => {
    return RANGE_DATA[activeRange as keyof typeof RANGE_DATA].map((value, index) => ({
      time: index,
      value,
    }))
  }, [activeRange])

  return (
    <>
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="bg-background px-1 py-2">
          <div className="max-w-[840px]">
            <div className="space-y-1">
              <div className="flex flex-col gap-1.5">
                <span className="font-data text-[22px] font-medium tracking-tight md:text-[28px]">
                  {showDollarAmounts ? `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "••••••••"}
                </span>
                <span className="font-data text-[12.5px] font-medium tabular-nums text-foreground/90">
                  {showDollarAmounts
                    ? `-$${rangeStats[activeRange as keyof typeof rangeStats]?.changeUsd.toFixed(2) || "312.96"} (-${rangeStats[activeRange as keyof typeof rangeStats]?.changePct.toFixed(2) || "3.80"}%) Today`
                    : "••••••••"}
                </span>
              </div>
            </div>

            <div className="mt-10 border-t border-dotted border-zinc-300/90 dark:border-zinc-700/90" />

            <div className="mt-7 h-[182px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="time" hide />
                  <YAxis
                    hide
                    domain={[
                      (dataMin: number) => dataMin - 6,
                      (dataMax: number) => dataMax + 6,
                    ]}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: "rgba(240, 90, 40, 0.16)", strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xs border border-border bg-popover px-2 py-1.5 shadow-elev-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                Point {payload[0].payload.time}
                              </span>
                              <span className="font-data text-[12.5px] font-medium text-foreground">
                                ${payload[0].value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="linear"
                    dataKey="value"
                    stroke={CHART_STROKE}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="-mb-px flex gap-10 overflow-x-auto">
                {["1D", "1W", "1M", "3M", "1Y", "ALL"].map((range) => (
                  <button
                    key={range}
                    onClick={() => setActiveRange(range)}
                    className={`relative pb-3 text-[13px] font-medium transition-colors ${
                      activeRange === range
                        ? "text-[#01AACF]"
                        : "text-foreground hover:text-[#01AACF]"
                    }`}
                  >
                    {range}
                    {activeRange === range ? (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#01AACF]" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: ACTION GRID & STATS */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => openDeposit(TOKENS[0])} className="flex flex-col items-start gap-3 rounded-radius-md border border-[#01AACF]/20 bg-[#01AACF]/10 p-3.5 text-[#01AACF] transition-colors hover:bg-[#01AACF]/15">
              <div className="flex h-7 w-7 items-center justify-center rounded-xs border border-[#01AACF]/25 bg-background/60">
                <ArrowUp className="h-3.5 w-3.5 rotate-45" />
              </div>
              <span className="font-medium text-[13px]">Deposit</span>
            </button>
            <button onClick={() => openWithdraw(TOKENS[0])} className="flex flex-col items-start gap-3 rounded-radius-md border border-[#01AACF]/20 bg-[#01AACF]/10 p-3.5 text-[#01AACF] transition-colors hover:bg-[#01AACF]/15">
              <div className="flex h-7 w-7 items-center justify-center rounded-xs border border-[#01AACF]/25 bg-background/60">
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
              <div className="font-data text-[18px] font-medium tabular-nums text-[#01AACF]">{rangeStats[activeRange as keyof typeof rangeStats]?.apy.toFixed(2) || "4.18"}%</div>
            </div>
            <div className="bg-surface-raised p-3.5">
              <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1 flex items-center gap-1.5">
                Interest earned <InfoTip text="Total yield earned from all active positions over time." />
              </div>
              <div className="font-data text-[18px] font-medium tabular-nums text-[#01AACF]">+${(totalEarned * (rangeStats[activeRange as keyof typeof rangeStats]?.earnedFraction || 1)).toFixed(2)}</div>
            </div>
          </div>

        </div>

      </div>
    </>
  )
}
