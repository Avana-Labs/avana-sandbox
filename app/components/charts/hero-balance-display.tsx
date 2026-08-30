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
  /** Inline node rendered right next to the value (e.g. a show/hide toggle or an info tooltip). */
  valueSuffix?: ReactNode
  /** Optional node rendered under the delta (e.g. an "Assets · Debt" breakdown). Masked when hidden. */
  subtitle?: ReactNode
  variant?: "default" | "strong" | "quiet"
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
  variant?: "default" | "strong" | "quiet"
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={
          tone === "positive" ? "flex items-center gap-1 text-[#01AACF]" : "flex items-center gap-1 text-rose-500"
        }
      >
        <span
          className={cn("leading-none", variant === "strong" ? "text-xs" : variant === "quiet" ? "text-xs" : "text-xs")}
        >
          {tone === "positive" ? "▲" : "▼"}
        </span>
        <span
          className={cn(
            "tabular-nums",
            variant === "strong"
              ? "text-base font-normal"
              : variant === "quiet"
                ? "text-sm font-normal lg:text-sm"
                : "text-sm font-normal",
          )}
        >
          {value}
        </span>
      </div>
      {meta ? <span className="text-sm font-normal text-muted-foreground">{meta}</span> : null}
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
  subtitle,
  variant = "default",
  className,
}: HeroBalanceDisplayProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <span className="block text-xs font-normal uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
      ) : null}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "leading-none text-foreground",
            variant === "strong"
              ? "text-3xl font-normal tracking-[-0.03em] sm:text-4xl md:text-4xl"
              : variant === "quiet"
                ? "font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-normal tracking-[-0.04em]"
                : "text-3xl font-normal tracking-[-0.03em] sm:text-3xl md:text-3xl",
          )}
        >
          {hidden ? "••••••••" : value}
        </span>
        {valueSuffix}
      </div>
      {hidden ? (
        <span className="text-sm text-muted-foreground">••••••••</span>
      ) : (
        <HeroDeltaText value={delta} tone={deltaTone} meta={meta} variant={variant} />
      )}
      {subtitle ? <div className="text-sm text-muted-foreground">{hidden ? "••••••••" : subtitle}</div> : null}
    </div>
  )
}

export function resolveDeltaTone(delta: string): "positive" | "negative" {
  return delta.trim().startsWith("-") || delta.includes("-$") ? "negative" : "positive"
}
