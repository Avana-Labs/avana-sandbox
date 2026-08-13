"use client"

import { useMemo } from "react"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useCurrency } from "@/app/lib/currency/use-currency"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { aggregateLendHeroFromMarkets } from "@/app/lib/lend-system/lend-hero-aggregates"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const LEND_METRICS = [
  { key: "averageApy", label: "Average APY" },
  { key: "avgUtilization", label: "Avg Utilization" },
] as const

export function LendHero({ markets }: { markets: ReadonlyArray<LendPageData["markets"][number]> }) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const fc = useCurrency()
  const { t } = useTranslation()

  const metrics = useMemo(() => aggregateLendHeroFromMarkets(markets), [markets])

  return (
    <section className="mb-4">
      <div className="flex w-full items-start justify-between gap-4 pb-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[13px] text-muted-foreground">{t("Lend TVL")}</p>
          <p className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-normal tabular-nums text-foreground">
            {showDollarAmounts ? fc.compact(metrics.totalTvl) : "••••••••"}
          </p>
        </div>

        <div className="hidden md:ml-auto md:flex md:gap-8 md:text-right">
          {LEND_METRICS.map((metric) => (
            <div key={metric.key} className="min-w-0 space-y-1.5">
              <p className="flex items-center justify-end gap-1.5 text-[13px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                {t(metric.label)}
              </p>
              <p className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-normal tabular-nums text-foreground">
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
