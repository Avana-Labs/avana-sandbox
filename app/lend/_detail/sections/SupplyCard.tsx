"use client"

import * as React from "react"
import type { LendMarketDetail } from "@/app/lib/lend-detail"
import { LightweightChart } from "@/app/borrow/_detail/ui/lw"
import { SectionCard } from "@/app/borrow/_detail/ui"
import { formatPct } from "@/app/lib/borrow-detail"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type View = "supplied" | "borrowed" | "utilization"

type Props = {
  detail: LendMarketDetail
}

const VIEW_LABEL: Record<View, string> = {
  supplied: "Supplied",
  borrowed: "Borrowed",
  utilization: "Utilization",
}

export function SupplyCard({ detail }: Props) {
  const { t } = useTranslation()
  const { compact } = useCurrency()
  const [view, setView] = React.useState<View>("supplied")

  const series =
    view === "supplied"
      ? detail.supplyBorrow.supplied
      : view === "borrowed"
        ? detail.supplyBorrow.borrowed
        : detail.supplyBorrow.utilization

  const tone: "neutral" | "positive" | "negative" = view === "borrowed" ? "negative" : "neutral"

  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">{t("Supply & Utilization")}</h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{t("Deposits, borrows, and utilization over time.")}</p>
        </div>
        <div role="tablist" className="inline-flex items-center gap-0.5 rounded-xs border border-border bg-surface-inset p-0.5">
          {(Object.keys(VIEW_LABEL) as View[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              type="button"
              onClick={() => setView(v)}
              className={
                view === v
                  ? "h-6 rounded-xs bg-surface-raised px-2 text-[11px] font-medium tabular-nums text-foreground shadow-elev-1"
                  : "h-6 rounded-xs px-2 text-[11px] font-medium tabular-nums text-muted-foreground hover:text-foreground"
              }
            >
              {t(VIEW_LABEL[v])}
            </button>
          ))}
        </div>
      </div>

      <SectionCard chrome="plain" bodyClassName="p-0">
        <div className="w-full pt-4">
          <LightweightChart
            series={series}
            type="area"
            height={240}
            tone={tone}
            accentClassName={detail.hero.visual.textClass}
            ariaLabel={t("{view} over time").replace("{view}", t(VIEW_LABEL[view]))}
            formatValue={(v) => (view === "utilization" ? formatPct(v, 2) : compact(v))}
          />
        </div>
      </SectionCard>
    </section>
  )
}
