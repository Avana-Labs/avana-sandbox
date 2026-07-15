"use client"

import { useMemo } from "react"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useCurrency } from "@/app/lib/currency/use-currency"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const LEND_METRICS = [
  { key: "averageApy", label: "Average APY" },
  { key: "avgUtilization", label: "Avg Utilization" },
] as const

function parseMarketUsd(value: string) {
  const normalized = value.trim().replace(/[$,]/g, "")
  const suffix = normalized.slice(-1).toUpperCase()
  const numericPortion = suffix >= "A" && suffix <= "Z" ? normalized.slice(0, -1) : normalized
  const amount = Number.parseFloat(numericPortion)
  if (!Number.isFinite(amount)) return 0
  if (suffix === "B") return amount * 1_000_000_000
  if (suffix === "M") return amount * 1_000_000
  if (suffix === "K") return amount * 1_000
  return amount
}

export function LendHero({ markets }: { markets: ReadonlyArray<LendPageData["markets"][number]> }) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const fc = useCurrency()
  const { t } = useTranslation()

  const metrics = useMemo(() => {
    const activeMarkets = markets.filter((market) => !market.soon)
    const marketValues = activeMarkets.map((market) => ({
      ...market,
      // Prefer the raw USD value (live path); only re-parse the formatted label as a
      // fallback for sources that don't carry it. Avoids precision loss / silent zeroing.
      tvlUsd: market.tvlUsd ?? parseMarketUsd(market.tvl),
    }))
    const totalTvl = marketValues.reduce((sum, market) => sum + market.tvlUsd, 0)
    const weightedApy =
      totalTvl > 0 ? marketValues.reduce((sum, market) => sum + market.apy * market.tvlUsd, 0) / totalTvl : 0
    const weightedUtilization =
      totalTvl > 0 ? marketValues.reduce((sum, market) => sum + market.utilization * market.tvlUsd, 0) / totalTvl : 0
    const weightedChange24h =
      totalTvl > 0 ? marketValues.reduce((sum, market) => sum + market.apyChange24h * market.tvlUsd, 0) / totalTvl : 0

    return {
      totalTvl,
      weightedApy,
      weightedUtilization,
      activeMarkets: activeMarkets.length,
      weightedChange24h,
    }
  }, [markets])

  return (
    <section className="mb-4">
      <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[12px] font-medium tracking-tight text-muted-foreground">{t("Total TVL")}</p>
            <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
              {showDollarAmounts ? fc.compact(metrics.totalTvl) : "••••••••"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-5 md:ml-auto md:text-right">
          {LEND_METRICS.map((metric) => (
            <div key={metric.key}>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground md:justify-end">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                {t(metric.label)}
              </div>
              <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                {showDollarAmounts
                  ? metric.key === "averageApy"
                    ? `${metrics.weightedApy.toFixed(2)}%`
                    : `${metrics.weightedUtilization.toFixed(2)}%`
                  : "••••••••"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
