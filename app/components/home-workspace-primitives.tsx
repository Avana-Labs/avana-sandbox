"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { HomeAssetVisual, HomeSuccessRow, HomeSuccessRowTone } from "@/app/lib/home-sim"

type PremiumPanelProps = {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}

type TokenBubbleProps = {
  visual: HomeAssetVisual
  className?: string
}

type PairVisualProps = {
  visuals: [HomeAssetVisual, HomeAssetVisual]
  className?: string
}

type DetailListProps = {
  rows: HomeSuccessRow[]
  className?: string
}

export function getToneClasses(tone: HomeSuccessRowTone = "default") {
  switch (tone) {
    case "positive":
      return "text-emerald-600"
    case "warning":
      return "text-amber-600"
    case "danger":
      return "text-rose-600"
    default:
      return "text-foreground"
  }
}

export function PremiumPanel({ title, description, action, className, contentClassName, children }: PremiumPanelProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[28px] border-border/70 bg-card/80 shadow-[0_18px_42px_rgba(15,23,42,0.045)] backdrop-blur-sm",
        className,
      )}
    >
      <CardHeader className="gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
          {description ? <CardDescription className="max-w-xl">{description}</CardDescription> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("p-5", contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function TokenBubble({ visual, className }: TokenBubbleProps) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full font-data text-[11px] font-semibold",
        visual.bgClassName,
        visual.textClassName,
        className,
      )}
      aria-hidden
    >
      {visual.shortLabel}
    </span>
  )
}

export function PairVisual({ visuals, className }: PairVisualProps) {
  return (
    <div className={cn("relative h-9 w-14 shrink-0", className)} aria-hidden>
      <TokenBubble visual={visuals[0]} className="absolute left-0 top-0 border-2 border-background" />
      <TokenBubble visual={visuals[1]} className="absolute left-5 top-0 border-2 border-background" />
    </div>
  )
}

export function ValueBadge({ label, tone = "default" }: { label: string; tone?: HomeSuccessRowTone }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full border-transparent bg-muted px-2.5 py-1 font-compact text-[11px] font-semibold",
        tone === "positive" && "bg-emerald-500/10 text-emerald-600",
        tone === "warning" && "bg-amber-500/10 text-amber-600",
        tone === "danger" && "bg-rose-500/10 text-rose-600",
      )}
    >
      {label}
    </Badge>
  )
}

export function DetailList({ rows, className }: DetailListProps) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-background/70", className)}>
      <div className="flex flex-col">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className={cn("font-data text-sm font-semibold", getToneClasses(row.tone))}>{row.value}</span>
            {index < rows.length - 1 ? <Separator className="sm:hidden" /> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PanelField({
  label,
  helper,
  action,
  children,
}: {
  label: string
  helper?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-border/60 bg-background/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {action}
      </div>
      {children}
      {helper ? <div className="text-xs text-muted-foreground">{helper}</div> : null}
    </div>
  )
}
