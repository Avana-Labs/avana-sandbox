"use client"

import type { ReactNode } from "react"
import { Minus, Plus } from "lucide-react"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

export type SummaryMetric = {
  label: string
  value: ReactNode
  help?: string
  valueClassName?: string
}

/**
 * Compact summary strip shown above each position table (reference "Deposited /
 * Collateral / Net Deposit APY" and "Borrowed / Borrow APY / Borrowing Power /
 * Loan Collateral"). Desktop: horizontal metrics split by dividers. Mobile:
 * vertical rows with the value on the left and the label on the right.
 */
export function AssetSummaryStrip({ metrics }: { metrics: SummaryMetric[] }) {
  const { t } = useTranslation()
  return (
    <div className="mb-4">
      {/* Desktop */}
      <div className="hidden md:flex md:items-stretch">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={cn(
              "flex flex-col gap-1 pr-8",
              index > 0 && "border-l border-border pl-8 dark:border-white/10",
            )}
          >
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
              {t(metric.label)}
              {metric.help ? <ActionMetricHelp topic={metric.label} text={metric.help} /> : null}
            </span>
            <span className={cn("font-data text-[22px] font-medium leading-none tabular-nums text-foreground", metric.valueClassName)}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
      {/* Mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between gap-3">
            <span className={cn("font-data text-[18px] font-medium tabular-nums text-foreground", metric.valueClassName)}>
              {metric.value}
            </span>
            <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
              {t(metric.label)}
              {metric.help ? <ActionMetricHelp topic={metric.label} text={metric.help} /> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Full-width expander row that reveals the "Main deposit / borrow opportunities".
 * Used both as a table row (`asRow` colSpan) and as a standalone button on mobile.
 */
export function OpportunitiesToggle({
  expanded,
  onToggle,
  showLabel,
  hideLabel,
  className,
}: {
  expanded: boolean
  onToggle: () => void
  showLabel: string
  hideLabel: string
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(
        "flex w-full items-center justify-between px-5 py-3.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-hover",
        className,
      )}
    >
      <span>{expanded ? t(hideLabel) : t(showLabel)}</span>
      {expanded ? (
        <Minus className="size-4 text-muted-foreground" />
      ) : (
        <Plus className="size-4 text-muted-foreground" />
      )}
    </button>
  )
}
