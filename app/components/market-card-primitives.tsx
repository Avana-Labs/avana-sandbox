"use client"

import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

export function MarketMobileCard({
  children,
  className,
  clickable = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  className?: string
  clickable?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-radius-lg border border-border bg-card px-4 py-4 shadow-elev-1",
        clickable ? "cursor-pointer transition-colors hover:border-brand/30" : "",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function MarketMobileCardHeader({
  identity,
  metric,
  className,
}: {
  identity: ReactNode
  metric?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      {identity}
      {metric ? <div className="text-right">{metric}</div> : null}
    </div>
  )
}

export function MarketMobileMetric({
  value,
  label,
  valueClassName,
}: {
  value: ReactNode
  label: ReactNode
  valueClassName?: string
}) {
  return (
    <>
      <div
        className={cn("font-data text-[18px] font-medium tabular-nums text-foreground dark:text-white", valueClassName)}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
    </>
  )
}

export function MarketMobileStatList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-border text-[12.5px]", className)}>{children}</dl>
}

export function MarketMobileStatRow({
  label,
  value,
  valueClassName,
}: {
  label: ReactNode
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-data font-medium tabular-nums text-foreground", valueClassName)}>{value}</dd>
    </div>
  )
}

export function MarketMobileInsetStats({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode
  columns?: 2 | 3
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-radius-sm border border-border bg-surface-inset",
        columns === 2 ? "grid grid-cols-2 divide-x divide-border" : "grid grid-cols-3 divide-x divide-border",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function MarketMobileInsetStat({
  value,
  label,
  valueClassName,
}: {
  value: ReactNode
  label: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-2.5">
      <span className={cn("font-data text-[14px] font-medium tabular-nums text-foreground", valueClassName)}>
        {value}
      </span>
      <span className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function MarketMobilePrimaryAction({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-radius-sm bg-brand px-4 text-center text-[13px] font-semibold text-brand-foreground shadow-elev-1 transition-colors hover:bg-brand/90 active:bg-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 disabled:!opacity-100 disabled:bg-brand-soft disabled:text-brand-soft-foreground [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
