"use client"

import type { AssetDetail } from "@/app/lib/borrow-detail"
import { formatPct } from "@/app/lib/borrow-detail"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { LightweightChart } from "../ui"

type Props = { detail: AssetDetail }

export function HistoricalUtilizationCard({ detail }: Props) {
  const { t } = useTranslation()
  return (
    <section className="min-w-0">
      <div className="mb-3">
        <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">
          {t("Historical utilization")}
        </h2>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{t("Borrowed ÷ supplied over the last 12 months.")}</p>
      </div>
      <div className="w-full pt-4">
        <LightweightChart
          series={detail.historicalUtilization}
          type="area"
          height={220}
          accentClassName={detail.hero.visual.textClass}
          ariaLabel={t("Historical utilization")}
          formatValue={(v) => formatPct(v, 2)}
        />
      </div>
    </section>
  )
}
