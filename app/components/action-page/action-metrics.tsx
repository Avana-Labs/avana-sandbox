"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

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

export function ActionMetricRow({
  label,
  value,
  tone = "default",
  tooltip,
}: {
  label: string
  value: string
  tone?: "default" | "positive" | "warning" | "danger"
  tooltip?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-[14px]" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span>{label}</span>
        {tooltip ? <span className="text-[11px] opacity-70" aria-hidden>ⓘ</span> : null}
      </div>
      <div
        className={cn(
          "font-medium tabular-nums",
          tone === "default" && "text-foreground",
          tone === "positive" && "text-emerald-500",
          tone === "warning" && "text-amber-500",
          tone === "danger" && "text-rose-500",
        )}
      >
        {value}
      </div>
    </div>
  )
}

export function ActionMetricsBlock({ rows }: { rows: Array<{ label: string; value: string; tone?: "default" | "positive" | "warning" | "danger" }> }) {
  if (rows.length === 0) return null
  return (
    <ActionCard data-testid="action-metrics-block">
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <ActionMetricRow key={row.label} label={row.label} value={row.value} tone={row.tone} tooltip="metric" />
        ))}
      </div>
    </ActionCard>
  )
}
