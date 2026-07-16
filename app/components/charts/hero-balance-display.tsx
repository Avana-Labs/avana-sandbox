import type { ReactNode } from "react"

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
}

function HeroDeltaText({ value, tone, meta }: { value: string; tone: "positive" | "negative"; meta?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={
          tone === "positive" ? "flex items-center gap-1 text-[#01AACF]" : "flex items-center gap-1 text-rose-500"
        }
      >
        <span className="text-[10px] leading-none">{tone === "positive" ? "▲" : "▼"}</span>
        <span className="text-[12px] font-normal tabular-nums">{value}</span>
      </div>
      {meta ? <span className="text-[12px] font-normal text-muted-foreground">{meta}</span> : null}
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
}: HeroBalanceDisplayProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <span className="block text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="text-[26px] font-normal leading-none tracking-[-0.03em] text-foreground sm:text-[28px] md:text-[30px]">
          {hidden ? "••••••••" : value}
        </span>
        {valueSuffix}
      </div>
      {hidden ? (
        <span className="text-[13px] text-muted-foreground">••••••••</span>
      ) : (
        <HeroDeltaText value={delta} tone={deltaTone} meta={meta} />
      )}
    </div>
  )
}

export function resolveDeltaTone(delta: string): "positive" | "negative" {
  return delta.trim().startsWith("-") || delta.includes("-$") ? "negative" : "positive"
}
