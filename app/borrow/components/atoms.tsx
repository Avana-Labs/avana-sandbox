"use client"

import { memo, type ButtonHTMLAttributes, type ReactNode } from "react"
import { EnhancedGraph } from "@/app/components/enhanced-graph"
import type { BorrowAssetVisual, BorrowSpoke, DexChip } from "@/app/lib/borrow-sim"
import { cn } from "@/lib/utils"

export function TokenBubble({
  visual,
  size = "sm",
  className,
}: {
  visual: BorrowAssetVisual
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}) {
  const dimensions = {
    xs: "size-4 text-[7px]",
    sm: "size-5 text-[8px]",
    md: "size-7 text-[9px]",
    lg: "size-9 text-[10px]",
  }[size]

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-white",
        dimensions,
        visual.bgClass,
        visual.textClass,
        className,
      )}
    >
      {visual.shortLabel}
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
  size?: "sm" | "md"
}) {
  const offset = size === "md" ? "-ml-2" : "-ml-1.5"
  const nameCls = size === "md" ? "text-[14px]" : "text-[13px]"
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center">
        <TokenBubble visual={visuals[0]} size={size === "md" ? "md" : "sm"} />
        <TokenBubble visual={visuals[1]} size={size === "md" ? "md" : "sm"} className={offset} />
      </div>
      <div className="min-w-0">
        <div className={cn("font-semibold text-slate-900", nameCls)}>{name}</div>
        {subtitle ? <div className="truncate text-[11px] text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  )
}

export function TokenSingleCell({
  visual,
  name,
  subtitle,
}: {
  visual: BorrowAssetVisual
  name: string
  subtitle?: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <TokenBubble visual={visual} size="md" />
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-slate-900">{name}</div>
        {subtitle ? <div className="truncate text-[11px] text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  )
}

export function SpokeDot({ spoke, label, withLabel = true, className }: { spoke: BorrowSpoke; label?: string; withLabel?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", spoke.dotClass)} aria-hidden />
      {withLabel ? <span className="text-[12px] font-medium text-slate-600">{label ?? spoke.label.replace(" Spoke", "")}</span> : null}
    </span>
  )
}

export function DexPill({ dex }: { dex: DexChip }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600">
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
        "inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums",
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
  const textSize = size === "lg" ? "text-[22px]" : size === "sm" ? "text-[12px]" : "text-[14px]"
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
  const sizeCls = size === "md" ? "h-10 px-5 text-[14px]" : "h-8 px-3.5 text-[12.5px]"
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
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors",
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
      <div className="text-[10.5px] font-medium uppercase tracking-[0.07em] text-slate-500">{label}</div>
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
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium", spoke.pillBgClass, spoke.pillTextClass)}>
      <span className={cn("size-1.5 rounded-full", spoke.dotClass)} aria-hidden />
      {spoke.label.replace(" Spoke", "")}
    </span>
  )
}
