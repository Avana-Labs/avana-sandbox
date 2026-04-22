"use client"

import { memo, useState, type ButtonHTMLAttributes, type ReactNode } from "react"
import Image from "next/image"
import { EnhancedGraph } from "@/app/components/enhanced-graph"
import type { BorrowAssetVisual, BorrowSpoke, DexChip } from "@/app/lib/borrow-sim"
import { cn } from "@/lib/utils"

type TokenBubbleSize = "xs" | "sm" | "md" | "lg" | "xl"

const BUBBLE_DIMENSIONS: Record<TokenBubbleSize, { box: string; text: string; px: number }> = {
  xs: { box: "size-4", text: "text-[7px]", px: 16 },
  sm: { box: "size-5", text: "text-[8px]", px: 20 },
  md: { box: "size-7", text: "text-[9px]", px: 28 },
  lg: { box: "size-9", text: "text-[10px]", px: 36 },
  xl: { box: "size-11", text: "text-[11px]", px: 44 },
}

export function TokenBubble({
  visual,
  size = "sm",
  className,
  ring = true,
}: {
  visual: BorrowAssetVisual
  size?: TokenBubbleSize
  className?: string
  ring?: boolean
}) {
  const { box, text, px } = BUBBLE_DIMENSIONS[size]
  const [imgFailed, setImgFailed] = useState(false)
  const showIcon = Boolean(visual.iconUrl) && !imgFailed

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        ring && "ring-2 ring-white",
        box,
        showIcon ? "bg-white" : `${visual.bgClass} ${visual.textClass}`,
        !showIcon && text,
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
  const bubbleSize: TokenBubbleSize = size === "lg" ? "xl" : size === "md" ? "lg" : "md"
  const offset = size === "lg" ? "-ml-3" : size === "md" ? "-ml-2.5" : "-ml-2"
  const nameCls = size === "lg" ? "text-[15px]" : size === "md" ? "text-[14px]" : "text-[13.5px]"
  const subtitleCls = size === "lg" ? "text-[12px]" : "text-xs"
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center">
        <TokenBubble visual={visuals[0]} size={bubbleSize} />
        <TokenBubble visual={visuals[1]} size={bubbleSize} className={offset} />
      </div>
      <div className="min-w-0">
        <div className={cn("font-semibold leading-tight text-slate-900", nameCls)}>{name}</div>
        {subtitle ? (
          <div className={cn("mt-0.5 truncate font-medium text-slate-500", subtitleCls)}>{subtitle}</div>
        ) : null}
      </div>
    </div>
  )
}

export function TokenSingleCell({
  visual,
  name,
  subtitle,
  size = "md",
}: {
  visual: BorrowAssetVisual
  name: string
  subtitle?: string
  size?: "sm" | "md" | "lg"
}) {
  const bubbleSize: TokenBubbleSize = size === "lg" ? "xl" : size === "md" ? "lg" : "md"
  const nameCls = size === "lg" ? "text-[15px]" : "text-[14px]"
  const subtitleCls = size === "lg" ? "text-[12px]" : "text-xs"
  return (
    <div className="flex items-center gap-3">
      <TokenBubble visual={visual} size={bubbleSize} />
      <div className="min-w-0">
        <div className={cn("font-semibold leading-tight text-slate-900", nameCls)}>{name}</div>
        {subtitle ? (
          <div className={cn("mt-0.5 truncate font-medium text-slate-500", subtitleCls)}>{subtitle}</div>
        ) : null}
      </div>
    </div>
  )
}

export function SpokeDot({ spoke, label, withLabel = true, className }: { spoke: BorrowSpoke; label?: string; withLabel?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", spoke.dotClass)} aria-hidden />
      {withLabel ? <span className="text-xs font-medium text-slate-600">{label ?? spoke.label.replace(" Spoke", "")}</span> : null}
    </span>
  )
}

export function DexPill({ dex }: { dex: DexChip }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
      {dex.label}
      {dex.starred ? <span className="ml-0.5 text-amber-500">★</span> : null}
    </span>
  )
}

export function DexChipRow({ dexes }: { dexes: DexChip[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {dexes.map((dex) => (
        <DexPill key={dex.id} dex={dex} />
      ))}
    </div>
  )
}

export function BorrowableTokenRow({ visuals }: { visuals: BorrowAssetVisual[] }) {
  return (
    <div className="flex items-center">
      {visuals.map((visual, index) => (
        <TokenBubble
          key={`${visual.symbol}-${index}`}
          visual={visual}
          size="xs"
          className={index === 0 ? undefined : "-ml-1"}
        />
      ))}
    </div>
  )
}

export const TrendSpark = memo(function TrendSpark({
  isPositive,
  seed,
  width = 64,
  height = 24,
}: {
  isPositive: boolean
  seed: string
  width?: number
  height?: number
}) {
  return (
    <div style={{ width, height }} className="shrink-0">
      <EnhancedGraph isPositive={isPositive} seed={seed} points={14} height={height} />
    </div>
  )
})

export function DeltaPill({ isPositive, value }: { isPositive: boolean; value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        isPositive ? "text-emerald-600" : "text-rose-600",
      )}
    >
      <span aria-hidden className="text-[9px]">
        {isPositive ? "▲" : "▼"}
      </span>
      {value}
    </span>
  )
}

export function HfNumber({ value, tone, size = "md" }: { value: string; tone: string; size?: "sm" | "md" | "lg" }) {
  const textSize = size === "lg" ? "text-[22px]" : size === "sm" ? "text-xs" : "text-[14px]"
  return <span className={cn("font-data font-semibold tabular-nums", textSize, tone)}>{value}</span>
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
    "inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
  const sizeCls = size === "md" ? "h-10 px-5 text-[14px]" : "h-8 px-3.5 text-sm"
  const variantCls = {
    primary: "bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400",
    ghost: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    danger: "border border-rose-200 bg-transparent text-rose-600 hover:bg-rose-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400",
  }[variant]
  return (
    <button type="button" {...props} className={cn(base, sizeCls, variantCls, className)}>
      {children}
    </button>
  )
}

export function DropdownChip({
  children,
  onClick,
  active,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
        active
          ? "bg-slate-900 text-white hover:bg-slate-800"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function StatItem({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium uppercase tracking-[0.07em] text-slate-500">{label}</div>
      <div className={cn("mt-1 font-data text-[17px] font-semibold tabular-nums text-slate-900", tone)}>{value}</div>
    </div>
  )
}

export function StatsStrip({ items }: { items: Array<{ label: string; value: string; tone?: string }> }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 sm:flex sm:items-start sm:gap-8">
      {items.map((item) => (
        <StatItem key={item.label} label={item.label} value={item.value} tone={item.tone} />
      ))}
    </div>
  )
}

export function SpokeTag({ spoke }: { spoke: BorrowSpoke }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium", spoke.pillBgClass, spoke.pillTextClass)}>
      <span className={cn("size-1.5 rounded-full", spoke.dotClass)} aria-hidden />
      {spoke.label.replace(" Spoke", "")}
    </span>
  )
}
