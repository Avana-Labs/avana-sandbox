"use client"

import { AmountVisibilityToggle } from "@/app/components/amount-visibility-toggle"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { cn } from "@/lib/utils"
import { formatCompactUsd, formatPct, formatUsd } from "../format"

export function UmbrellaHero() {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const umbrella = useUmbrellaSessionContext()
  const totalMarketStakedUsd = umbrella.marketOrder.reduce((sum, id) => sum + umbrella.markets[id].totalStakedUsd, 0)
  const totalStakedUsd = umbrella.marketOrder.reduce((sum, id) => sum + umbrella.positions[id].valueUsd, 0)
  const weightedApy =
    totalStakedUsd > 0
      ? umbrella.marketOrder.reduce((sum, id) => sum + umbrella.positions[id].valueUsd * umbrella.markets[id].apy, 0) /
        totalStakedUsd
      : 0
  const cooldownUsd = umbrella.marketOrder
    .filter((id) => umbrella.positions[id].cooldownStatus === "cooling")
    .reduce((sum, id) => sum + umbrella.positions[id].cooldownValueUsd, 0)
  const readyIds = umbrella.marketOrder.filter((id) => umbrella.positions[id].cooldownStatus === "ready")
  const readyUsd = readyIds.reduce((sum, id) => sum + umbrella.positions[id].cooldownValueUsd, 0)
  const readySymbols = readyIds.map((id) => umbrella.markets[id].symbol).join(", ")
  const cooldownShare = totalStakedUsd > 0 ? (cooldownUsd / totalStakedUsd) * 100 : 0
  const userUmbrellaSnapshot = [
    {
      label: "Your Umbrella stake",
      value: formatUsd(totalStakedUsd),
      change: `${formatCompactUsd(totalMarketStakedUsd)} market`,
      tone: "muted" as const,
    },
    { label: "Weighted APY", value: `${formatPct(weightedApy)}%`, change: "live mix", tone: "muted" as const },
    {
      label: "In cooldown",
      value: formatCompactUsd(cooldownUsd),
      change: `${formatPct(cooldownShare)}%`,
      tone: "warning" as const,
    },
    {
      label: "Withdrawal ready",
      value: formatCompactUsd(readyUsd),
      change: readySymbols || "none",
      tone: "muted" as const,
    },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Your Umbrella
        </h2>
        <AmountVisibilityToggle />
      </div>
      <section className="relative overflow-hidden rounded-radius-md bg-card px-4 py-5 dark:bg-white/[0.04] sm:px-5">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1.2px)] [background-position:18px_18px] [background-size:16px_16px] dark:opacity-20 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1.2px)]" />
        <div className="relative">
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:divide-x lg:divide-border">
            {userUmbrellaSnapshot.map((item) => (
              <div key={item.label} className="min-w-0 lg:px-5 first:lg:pl-0 last:lg:pr-0">
                <div className="text-[13px] text-muted-foreground">{item.label}</div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
                    {showDollarAmounts ? item.value : "••••"}
                  </span>
                  {showDollarAmounts ? (
                    <span
                      className={cn(
                        "text-[13px] font-semibold tabular-nums lg:text-[14px]",
                        item.tone === "warning" && "text-warning",
                        item.tone === "muted" && "text-muted-foreground",
                      )}
                    >
                      {item.change}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
