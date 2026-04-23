"use client"

import Image from "next/image"
import { useState, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getTokenIconMeta } from "@/app/lib/token-icons"
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
      return "text-emerald-600 dark:text-emerald-400"
    case "warning":
      return "text-amber-600 dark:text-amber-400"
    case "danger":
      return "text-rose-600 dark:text-rose-400"
    default:
      return "text-foreground"
  }
}

export function PremiumPanel({ title, description, action, className, contentClassName, children }: PremiumPanelProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1",
        className,
      )}
    >
      <CardHeader className="gap-2 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="text-[14px] font-medium tracking-tight">{title}</CardTitle>
          {description ? <CardDescription className="max-w-xl text-[12px]">{description}</CardDescription> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("p-4", contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function TokenBubble({ visual, className }: TokenBubbleProps) {
  const meta = getTokenIconMeta(visual.symbol)
  const [imgFailed, setImgFailed] = useState(false)
  const showIcon = Boolean(meta.iconUrl) && !imgFailed

  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full font-data text-[10.5px] font-medium",
        showIcon ? "bg-surface-raised ring-1 ring-border" : cn(visual.bgClassName, visual.textClassName),
        className,
      )}
      aria-hidden
    >
      {showIcon ? (
        <Image
          src={meta.iconUrl as string}
          alt={visual.symbol}
          width={28}
          height={28}
          className="h-full w-full object-contain"
          onError={() => setImgFailed(true)}
          unoptimized
        />
      ) : (
        visual.shortLabel
      )}
    </span>
  )
}

export function PairVisual({ visuals, className }: PairVisualProps) {
  return (
    <div className={cn("relative h-7 w-11 shrink-0", className)} aria-hidden>
      <TokenBubble visual={visuals[0]} className="absolute left-0 top-0 ring-2 ring-background" />
      <TokenBubble visual={visuals[1]} className="absolute left-4 top-0 ring-2 ring-background" />
    </div>
  )
}

export function ValueBadge({ label, tone = "default" }: { label: string; tone?: HomeSuccessRowTone }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-xs border border-border bg-surface-inset px-1.5 py-0.5 font-compact text-[10.5px] font-medium uppercase tracking-[0.04em]",
        tone === "positive" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        tone === "warning" && "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        tone === "danger" && "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
      )}
    >
      {label}
    </Badge>
  )
}

export function DetailList({ rows, className }: DetailListProps) {
  return (
    <div className={cn("rounded-radius-sm border border-border bg-surface-inset", className)}>
      <div className="flex flex-col divide-y divide-border">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex flex-col gap-1 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[12px] text-muted-foreground">{row.label}</span>
            <span className={cn("font-data text-[12.5px] font-medium tabular-nums", getToneClasses(row.tone))}>{row.value}</span>
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
    <div className="flex flex-col gap-2 rounded-radius-sm border border-border bg-surface-inset p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
        {action}
      </div>
      {children}
      {helper ? <div className="text-[11px] text-muted-foreground">{helper}</div> : null}
    </div>
  )
}
