"use client"

import { cn } from "@/lib/utils"

type BipolarBarProps = {
  /** Left-side magnitude (e.g. used, long OI, supplied). */
  leftValue: number
  /** Right-side magnitude (e.g. remaining, short OI, borrowed). */
  rightValue: number
  /** Text label rendered at the far left, inside or beneath the bar. */
  leftLabel?: string
  /** Text label rendered at the far right. */
  rightLabel?: string
  /** Tailwind classes for the left segment fill. */
  leftClass?: string
  /** Tailwind classes for the right segment fill. */
  rightClass?: string
  /** Tailwind classes for the left label color. */
  leftLabelClass?: string
  /** Tailwind classes for the right label color. */
  rightLabelClass?: string
  /** Height of the bar. Default `h-2.5`. */
  heightClass?: string
  /**
   * Where labels sit relative to the bar.
   * "inside" embeds them on top of the colored segments (Toss style).
   * "outside" places them beneath the bar.
   */
  labelPosition?: "inside" | "outside"
  className?: string
}

/**
 * Two-color horizontal ratio bar with labels anchored at each end.
 * Mimics the Toss Securities buy/sell ratio visualization.
 */
export function BipolarBar({
  leftValue,
  rightValue,
  leftLabel,
  rightLabel,
  leftClass = "bg-rose-500",
  rightClass = "bg-emerald-500",
  leftLabelClass = "text-rose-600 dark:text-rose-400",
  rightLabelClass = "text-emerald-600 dark:text-emerald-400",
  heightClass = "h-2.5",
  labelPosition = "inside",
  className,
}: BipolarBarProps) {
  const total = Math.max(0, leftValue) + Math.max(0, rightValue)
  const leftPct = total > 0 ? (Math.max(0, leftValue) / total) * 100 : 50
  const rightPct = 100 - leftPct

  const bar = (
    <div className={cn("relative w-full overflow-hidden rounded-full bg-muted", heightClass)}>
      <div
        className={cn("absolute inset-y-0 left-0 transition-[width] duration-200 ease-out", leftClass)}
        style={{ width: `${leftPct}%` }}
      />
      <div
        className={cn("absolute inset-y-0 right-0 transition-[width] duration-200 ease-out", rightClass)}
        style={{ width: `${rightPct}%` }}
      />
    </div>
  )

  if (labelPosition === "inside") {
    return (
      <div className={cn("relative w-full", className)}>
        {bar}
        {(leftLabel || rightLabel) ? (
          <div className="pointer-events-none mt-1 flex items-center justify-between font-data text-[10.5px] font-medium tabular-nums">
            <span className={cn(leftLabelClass)}>{leftLabel}</span>
            <span className={cn(rightLabelClass)}>{rightLabel}</span>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      {bar}
      {(leftLabel || rightLabel) ? (
        <div className="mt-1 flex items-center justify-between font-data text-[10.5px] font-medium tabular-nums">
          <span className={cn(leftLabelClass)}>{leftLabel}</span>
          <span className={cn(rightLabelClass)}>{rightLabel}</span>
        </div>
      ) : null}
    </div>
  )
}
