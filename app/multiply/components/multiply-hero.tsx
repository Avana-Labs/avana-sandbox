"use client"

import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { MultiplyHeroMetrics } from "@/app/lib/data/providers/multiply"
import { cn } from "@/lib/utils"

const HIDDEN = "••••••"

export function MultiplyHero({ metrics }: { metrics: MultiplyHeroMetrics }) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const fc = useCurrency()
  const { t } = useTranslation()

  const stats = [
    { label: t("Avg APY at max leverage"), value: `${(metrics.averageMaxApy * 100).toFixed(2)}%`, sensitive: false },
    { label: t("Avg Max Leverage"), value: `${metrics.averageMaxLeverage.toFixed(1)}x`, sensitive: false },
  ]

  return (
    <section className="mb-4">
      <div className="grid w-full grid-cols-3 gap-x-3 pb-4 md:flex md:items-end md:justify-between md:gap-4">
        <div className="min-w-0">
          <p className="text-[12px] font-medium tracking-tight text-muted-foreground">{t("Total Liquidity")}</p>
          <p className="mt-1 font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
            {showDollarAmounts ? fc.compact(metrics.totalLiquidityUsd) : HIDDEN}
          </p>
        </div>

        <div className="contents md:ml-auto md:flex md:gap-5 md:text-right">
          {stats.map((metric, index) => (
            <div key={metric.label} className={cn("min-w-0", index === stats.length - 1 && "text-right")}>
              <div className="mb-0 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground md:mb-1 md:justify-end">
                <span className="hidden h-1.5 w-1.5 rounded-full bg-muted-foreground md:inline-block" />
                {metric.label}
              </div>
              <p className="mt-1 font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[1rem] md:font-semibold">
                {metric.sensitive && !showDollarAmounts ? HIDDEN : metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
