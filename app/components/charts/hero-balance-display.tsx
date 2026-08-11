import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type HeroBalanceDisplayProps = {
  value: string
  delta: string
  deltaTone?: "positive" | "negative"
  /** Muted text shown after the delta (e.g. a date). */
  meta?: string
  hidden?: boolean
  /** Small uppercase metric label shown above the value (e.g. "Total borrows"). */
  label?: string
  /** Inline node rendered right next to the value (e.g. a show/hide toggle). */
  valueSuffix?: ReactNode
  variant?: "default" | "strong"
  className?: string
}

function HeroDeltaText({
  value,
  tone,
  meta,
  variant = "default",
}: {
  value: string
  tone: "positive" | "negative"
  meta?: string
  variant?: "default" | "strong"
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={
          tone === "positive" ? "flex items-center gap-1 text-[#01AACF]" : "flex items-center gap-1 text-rose-500"
        }
      >
        <span className={cn("leading-none", variant === "strong" ? "text-[12px]" : "text-[11px]")}>
          {tone === "positive" ? "▲" : "▼"}
        </span>
        <span className={cn("tabular-nums", variant === "strong" ? "text-[15px] font-semibold" : "text-[14px] font-medium")}>
          {value}
        </span>
      </div>
      {meta ? <span className="text-[13px] font-normal text-muted-foreground">{meta}</span> : null}
    </div>
  )
}

export function HeroBalanceDisplay({
  value,
  delta,
  deltaTone = "positive",
  meta,
  hidden = false,
  label,
  valueSuffix,
  variant = "default",
  className,
}: HeroBalanceDisplayProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <span className="block text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "leading-none tracking-[-0.03em] text-foreground",
            variant === "strong"
              ? "text-[29px] font-semibold sm:text-[32px] md:text-[34px]"
              : "text-[26px] font-normal sm:text-[28px] md:text-[30px]",
          )}
        >
          {hidden ? "••••••••" : value}
        </span>
        {valueSuffix}
      </div>
      {hidden ? (
        <span className="text-[13px] text-muted-foreground">••••••••</span>
      ) : (
        <HeroDeltaText value={delta} tone={deltaTone} meta={meta} variant={variant} />
      )}
    </div>
  )
}

export function resolveDeltaTone(delta: string): "positive" | "negative" {
  return delta.trim().startsWith("-") || delta.includes("-$") ? "negative" : "positive"
}
