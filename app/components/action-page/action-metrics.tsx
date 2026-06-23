"use client"

import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { ActionHealthFactorBar } from "@/app/components/action-page/action-health-factor-bar"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { ActionTokenIcon } from "@/app/components/action-page/action-token-icon"
import type { ActionMetricRow, ActionMetricTone } from "@/app/lib/action-system/contracts"
import { ACTION_INFO_TOOLTIPS, resolveMetricTooltip } from "@/app/lib/action-system/metric-tooltips"
import { isHealthFactorMetric, parseHealthFactorValue, resolveMetricTone } from "@/app/lib/action-system/health-factor-ui"

export function ActionCard({
  children,
  className,
  ...props
}: {
  children: ReactNode
  className?: string
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("rounded-radius-md border-0 bg-card", className)} {...props}>
      {children}
    </div>
  )
}

export function ActionInfoRow({
  label,
  value,
  tooltip,
  className,
}: {
  label: string
  value: ReactNode
  tooltip?: string
  className?: string
}) {
  const tip = tooltip ? ACTION_INFO_TOOLTIPS[tooltip] ?? tooltip : undefined
  return (
    <div className={cn("flex items-center justify-between gap-4 px-4 py-3 text-[14px]", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span>{label}</span>
        {tip ? <ActionMetricHelp text={tip} /> : null}
      </div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  )
}

function toneClassName(tone: ActionMetricTone) {
  return cn(
    tone === "default" && "text-foreground",
    tone === "positive" && "text-emerald-500",
    tone === "warning" && "text-amber-500",
    tone === "danger" && "text-rose-500",
  )
}

function TokenSymbolRow({ symbols }: { symbols: string[] }) {
  return (
    <div className="flex items-center gap-1.5" data-testid="borrowable-asset-icons">
      {symbols.map((symbol) => (
        <ActionTokenIcon key={symbol} symbol={symbol} />
      ))}
    </div>
  )
}

function MetricValue({
  label,
  value,
  before,
  after,
  tone = "default",
  id,
  tokenSymbols,
}: {
  label: string
  value: string
  before?: string
  after?: string
  tone?: ActionMetricTone
  id?: string
  tokenSymbols?: string[]
}) {
  if (tokenSymbols && tokenSymbols.length > 0) {
    return <TokenSymbolRow symbols={tokenSymbols} />
  }

  const resolvedTone = resolveMetricTone(label, tone, after, id)
  const showHeart = isHealthFactorMetric(label, id)

  if (before && after) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 font-medium tabular-nums", toneClassName(resolvedTone))}>
        <span className="text-muted-foreground">{before}</span>
        <span className="text-muted-foreground/70">→</span>
        <span className={cn("inline-flex items-center gap-1", toneClassName(resolvedTone))}>
          {showHeart ? <Heart className={cn("size-3.5", resolvedTone === "positive" && "fill-emerald-500")} aria-hidden /> : null}
          {after}
        </span>
      </div>
    )
  }

  return (
    <div className={cn("inline-flex items-center gap-1 font-medium tabular-nums", toneClassName(resolvedTone))}>
      {showHeart ? <Heart className={cn("size-3.5", resolvedTone === "positive" && "fill-emerald-500")} aria-hidden /> : null}
      {value}
    </div>
  )
}

export function ActionMetricRow({
  label,
  value,
  before,
  after,
  tone = "default",
  tooltip,
  id,
  tokenSymbols,
}: ActionMetricRow) {
  const tip = resolveMetricTooltip(id, label, tooltip)
  return (
    <div data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-[14px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>{label}</span>
          <ActionMetricHelp text={tip} />
        </div>
        <MetricValue label={label} value={value} before={before} after={after} tone={tone} id={id} tokenSymbols={tokenSymbols} />
      </div>
    </div>
  )
}

export function ActionMetricsBlock({ rows }: { rows: ActionMetricRow[] }) {
  if (rows.length === 0) return null

  const hfRow = rows.find((row) => isHealthFactorMetric(row.label, row.id))
  const hfValue = parseHealthFactorValue(hfRow?.after ?? hfRow?.value)
  const detailRows = rows.filter((row) => !isHealthFactorMetric(row.label, row.id))

  return (
    <div className="space-y-3" data-testid="action-metrics-block">
      {hfRow ? (
        <ActionCard className="p-4" data-testid="action-health-factor-card">
          <ActionHealthFactorBar value={hfValue} />
          {hfRow.before && hfRow.after ? (
            <div className="mt-3 text-[12px] tabular-nums text-muted-foreground">
              {hfRow.before} → {hfRow.after}
            </div>
          ) : null}
        </ActionCard>
      ) : null}

      {detailRows.length > 0 ? (
        <ActionCard className="overflow-hidden">
          <div className="divide-y divide-border">
            {detailRows.map((row) => (
              <ActionMetricRow
                key={row.id ?? row.label}
                id={row.id}
                label={row.label}
                value={row.value}
                before={row.before}
                after={row.after}
                tone={row.tone}
                tokenSymbols={row.tokenSymbols}
                tooltip={row.tooltip}
              />
            ))}
          </div>
        </ActionCard>
      ) : null}
    </div>
  )
}
