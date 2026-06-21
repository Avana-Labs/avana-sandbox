"use client"

import type { ReactNode } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { ActionHealthFactorBar } from "@/app/components/action-page/action-health-factor-bar"
import { ActionTokenIcon } from "@/app/components/action-page/action-token-icon"
import type { ActionMetricRow, ActionMetricTone } from "@/app/lib/action-system/contracts"
import { isHealthFactorMetric, parseHealthFactorValue, resolveMetricTone } from "@/app/lib/action-system/health-factor-ui"

export function ActionCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-[20px] border border-border bg-surface-raised", className)}>{children}</div>
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
  return (
    <div className={cn("flex items-center justify-between gap-4 px-4 py-3 text-[14px]", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span>{label}</span>
        {tooltip ? <span className="text-[11px] opacity-70" aria-hidden>ⓘ</span> : null}
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
        <ActionTokenIcon key={symbol} symbol={symbol} className="size-6" />
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
  const showHealthBar = isHealthFactorMetric(label, id) && after != null

  return (
    <div data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-[14px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>{label}</span>
          {tooltip ? <span className="text-[11px] opacity-70" aria-hidden>ⓘ</span> : null}
        </div>
        <MetricValue label={label} value={value} before={before} after={after} tone={tone} id={id} tokenSymbols={tokenSymbols} />
      </div>
      {showHealthBar ? <ActionHealthFactorBar value={parseHealthFactorValue(after)} className="border-t border-border px-4 py-3" /> : null}
    </div>
  )
}

export function ActionMetricsBlock({ rows }: { rows: ActionMetricRow[] }) {
  if (rows.length === 0) return null
  return (
    <ActionCard data-testid="action-metrics-block">
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <ActionMetricRow
            key={row.id ?? row.label}
            id={row.id}
            label={row.label}
            value={row.value}
            before={row.before}
            after={row.after}
            tone={row.tone}
            tokenSymbols={row.tokenSymbols}
            tooltip="metric"
          />
        ))}
      </div>
    </ActionCard>
  )
}
