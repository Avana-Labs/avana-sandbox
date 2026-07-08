"use client"

import { useDisplayPreferences } from "@/app/components/display-preferences"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { MultiplyHeroMetrics } from "@/app/lib/data/providers/multiply"

const HIDDEN = "••••••"

export function MultiplyHero({ metrics }: { metrics: MultiplyHeroMetrics }) {
  const { showDollarAmounts } = useDisplayPreferences()
  const fc = useCurrency()
  const { t } = useTranslation()

  const stats = [
    { label: t("Loop Markets"), value: `${metrics.marketCount}`, sensitive: false },
    { label: t("Avg Max APY"), value: `${(metrics.averageMaxApy * 100).toFixed(2)}%`, sensitive: false },
    { label: t("Avg Max Leverage"), value: `${metrics.averageMaxLeverage.toFixed(1)}x`, sensitive: false },
  ]

  return (
    <section className="mb-4">
      <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[12px] font-medium tracking-tight text-muted-foreground">{t("Total Liquidity")}</p>
            <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
              {showDollarAmounts ? fc.compact(metrics.totalLiquidityUsd) : HIDDEN}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-5 md:ml-auto md:text-right">
          {stats.map((metric) => (
            <div key={metric.label}>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground md:justify-end">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                {metric.label}
              </div>
              <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                {metric.sensitive && !showDollarAmounts ? HIDDEN : metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
