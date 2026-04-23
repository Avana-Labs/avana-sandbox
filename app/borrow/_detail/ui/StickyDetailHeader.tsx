"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { Series } from "@/app/lib/borrow-detail"

type SparklineProps = {
  series: Series
  tone?: "positive" | "negative" | "neutral"
}

type StickyDetailHeaderProps = {
  /** Ref to the hero element below which the sticky header should appear. */
  heroRef: React.RefObject<HTMLElement | null>
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Right-aligned CTA area, e.g. Supply / Borrow buttons. */
  actions?: React.ReactNode
  /** Optional inline sparkline rendered between the title and actions. */
  sparkline?: SparklineProps
  className?: string
}

/**
 * Compact condensed header that fades in after the hero scrolls off screen.
 * Uses IntersectionObserver with a 0px root margin and a 0 threshold so the
 * transition is triggered as soon as the hero leaves the viewport.
 *
 * Rendered sticky at `top-0` so the page content flows under it.
 */
export function StickyDetailHeader({
  heroRef,
  title,
  subtitle,
  actions,
  sparkline,
  className,
}: StickyDetailHeaderProps) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [heroRef])

  return (
    <div
      role="banner"
      aria-hidden={!visible}
      data-visible={visible}
      className={cn(
        "pointer-events-none fixed left-0 right-0 top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md transition-all duration-200",
        visible ? "translate-y-0 opacity-100 pointer-events-auto" : "-translate-y-1 opacity-0",
        className,
      )}
    >
      <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-3">
            {title}
          </div>
          {subtitle ? (
            <div className="hidden truncate text-[12px] text-muted-foreground sm:block">{subtitle}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {sparkline ? <Sparkline {...sparkline} /> : null}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}

function Sparkline({ series, tone = "neutral" }: SparklineProps) {
  const { d, dir } = React.useMemo(() => buildPath(series.points.map((p) => p.v)), [series])
  const strokeClass =
    tone === "positive"
      ? "text-emerald-500"
      : tone === "negative"
        ? "text-rose-500"
        : dir === "up"
          ? "text-emerald-500"
          : dir === "down"
            ? "text-rose-500"
            : "text-muted-foreground"
  if (!d) return null
  return (
    <svg
      aria-hidden
      role="img"
      data-testid="sticky-sparkline"
      width={80}
      height={24}
      viewBox="0 0 80 24"
      className={cn("hidden shrink-0 md:block", strokeClass)}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function buildPath(values: number[]): { d: string | null; dir: "up" | "down" | "flat" } {
  if (!values.length) return { d: null, dir: "flat" }
  const w = 80
  const h = 24
  const pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0
  const pts = values.map((v, i) => {
    const x = pad + i * step
    const y = pad + (h - pad * 2) * (1 - (v - min) / span)
    return [x, y] as const
  })
  const d = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ")
  const first = values[0]
  const last = values[values.length - 1]
  const dir: "up" | "down" | "flat" = last > first * 1.001 ? "up" : last < first * 0.999 ? "down" : "flat"
  return { d, dir }
}
