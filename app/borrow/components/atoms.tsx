"use client"

import { memo, useState, type ButtonHTMLAttributes } from "react"
import Image from "next/image"
import { EnhancedGraph } from "@/app/components/enhanced-graph"
import type { BorrowAssetVisual, DexChip } from "@/app/lib/data/borrow-domain"
import { TOKEN_ICON_TABLE_PX } from "@/app/lib/token-icon-sizes"
import { cn } from "@/lib/utils"

type TokenBubbleSize = "xs" | "sm" | "md" | "table" | "lg" | "xl"

const BUBBLE_DIMENSIONS: Record<TokenBubbleSize, { box: string; text: string; px: number }> = {
  xs: { box: "size-4", text: "text-[7px]", px: 16 },
  sm: { box: "size-5", text: "text-[8px]", px: 20 },
  md: { box: "size-7", text: "text-[9px]", px: 28 },
  table: { box: "size-12", text: "text-xs", px: TOKEN_ICON_TABLE_PX },
  lg: { box: "size-9", text: "text-xs", px: 36 },
  xl: { box: "size-11", text: "text-xs", px: 44 },
}

export function TokenBubble({
  visual,
  size = "sm",
  className,
  ring = true,
  eager = false,
}: {
  visual: BorrowAssetVisual
  size?: TokenBubbleSize
  className?: string
  ring?: boolean
  eager?: boolean
}) {
  const { box, text, px } = BUBBLE_DIMENSIONS[size]
  const [imgFailed, setImgFailed] = useState(false)
  const showIcon = Boolean(visual.iconUrl) && !imgFailed

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center font-normal",
        box,
        // A real token icon renders as a bare transparent PNG — no circular plate, card
        // background, ring or clip. Only the initials fallback keeps the colored avatar circle.
        showIcon
          ? null
          : cn(
              "overflow-hidden rounded-full",
              ring && "ring-2 ring-background",
              visual.bgClass,
              visual.textClass,
              text,
            ),
        className,
      )}
    >
      {showIcon ? (
        <Image
          src={visual.iconUrl as string}
          alt={visual.symbol}
          width={px}
          height={px}
          className="h-full w-full object-contain"
          // Logos are local SVGs (see getLocalAssetIcon). Lazy-load + async-decode so a
          // long market list doesn't decode every off-screen icon up front, and fall back
          // to the token's colored initials if an icon is ever missing.
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : undefined}
          decoding="async"
          onError={() => setImgFailed(true)}
          unoptimized
        />
      ) : (
        visual.shortLabel
      )}
    </span>
  )
}

export function TokenPairCell({
  visuals,
  name,
  subtitle,
  size = "sm",
}: {
  visuals: [BorrowAssetVisual, BorrowAssetVisual]
  name: string
  subtitle?: string
  size?: "sm" | "md" | "lg"
}) {
  const bubbleSize: TokenBubbleSize = size === "lg" ? "xl" : size === "md" ? "table" : "sm"
  const offset = size === "lg" ? "-ml-3" : size === "md" ? "-ml-2.5" : "-ml-2"
  const nameCls = size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-sm"
  const subtitleCls = size === "lg" ? "text-xs" : "text-xs"
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        <TokenBubble visual={visuals[0]} size={bubbleSize} />
        <TokenBubble visual={visuals[1]} size={bubbleSize} className={offset} />
      </div>
      <div className="min-w-0">
        <div className={cn("font-normal leading-tight text-foreground", nameCls)}>{name}</div>
        {subtitle ? <div className={cn("mt-0.5 truncate text-muted-foreground", subtitleCls)}>{subtitle}</div> : null}
      </div>
    </div>
  )
}

export function TokenSingleCell({
  visual,
  name,
  subtitle,
  size = "md",
  eager = false,
}: {
  visual: BorrowAssetVisual
  name: string
  subtitle?: string
  size?: "sm" | "md" | "lg"
  eager?: boolean
}) {
  const bubbleSize: TokenBubbleSize = size === "lg" ? "xl" : size === "md" ? "table" : "sm"
  const nameCls = size === "lg" ? "text-base" : "text-sm"
  const subtitleCls = size === "lg" ? "text-xs" : "text-xs"
  return (
    <div className="flex items-center gap-3">
      <TokenBubble visual={visual} size={bubbleSize} eager={eager} />
      <div className="min-w-0">
        <div className={cn("font-normal leading-tight text-foreground", nameCls)}>{name}</div>
        {subtitle ? <div className={cn("mt-0.5 truncate text-muted-foreground", subtitleCls)}>{subtitle}</div> : null}
      </div>
    </div>
  )
}

export function DexPill({ dex }: { dex: DexChip }) {
  return (
    <span className="inline-flex items-center rounded-xs border border-border bg-surface-inset px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
      {dex.label}
      {dex.starred ? <span className="ml-0.5 text-amber-500">★</span> : null}
    </span>
  )
}

export const TrendSpark = memo(function TrendSpark({
  isPositive,
  seed,
  values,
  width = 64,
  height = 24,
}: {
  isPositive: boolean
  seed: string
  values?: number[]
  width?: number
  height?: number
}) {
  return (
    <div style={{ width, height }} className="shrink-0">
      <EnhancedGraph isPositive={isPositive} seed={seed} values={values} points={14} height={height} />
    </div>
  )
})

export function HfNumber({ value, tone, size = "md" }: { value: string; tone: string; size?: "sm" | "md" | "lg" }) {
  const textSize = size === "lg" ? "text-xl" : size === "sm" ? "text-xs" : "text-sm"
  return <span className={cn("font-data font-normal tabular-nums", textSize, tone)}>{value}</span>
}

export type PillVariant = "primary" | "ghost" | "danger" | "success"

export function PillButton({
  variant = "primary",
  size = "sm",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: PillVariant; size?: "sm" | "md" }) {
  const base =
    "inline-flex items-center justify-center rounded-radius-sm font-normal transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
  const sizeCls = size === "md" ? "h-9 px-4 text-sm" : "h-7 px-2.5 text-xs"
  const variantCls = {
    primary:
      "bg-brand text-white shadow-elev-1 hover:bg-brand/90 active:bg-brand/80 disabled:!opacity-100 disabled:bg-brand-soft disabled:text-brand-soft-foreground disabled:shadow-none",
    ghost: "border border-border bg-surface-raised text-foreground hover:bg-surface-hover",
    danger: "border border-destructive/30 bg-transparent text-destructive hover:bg-destructive/5 dark:text-rose-300",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-muted disabled:text-muted-foreground",
  }[variant]
  return (
    <button type="button" {...props} className={cn(base, sizeCls, variantCls, className)}>
      {children}
    </button>
  )
}

export function StatItem({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-normal uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-data text-base font-normal tabular-nums text-foreground", tone)}>{value}</div>
    </div>
  )
}
