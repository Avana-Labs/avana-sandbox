"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { RiskLevel } from "@/app/lib/borrow-detail"
import { riskLevelLabel } from "@/app/lib/borrow-detail"

type RiskLevelPillProps = {
  level: RiskLevel
  className?: string
  /** Text prefix (e.g. "Risk:"). */
  prefix?: string
  /** Render with a small dot. Defaults to true. */
  withDot?: boolean
  size?: "sm" | "md"
}

const TONE: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
  low: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  moderate: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  elevated: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
  high: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500" },
}

export function RiskLevelPill({ level, className, prefix, withDot = true, size = "sm" }: RiskLevelPillProps) {
  const tone = TONE[level]
  const sizeCls = size === "md" ? "h-6 text-[11.5px] px-2" : "h-5 text-[10.5px] px-1.5"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xs font-medium",
        sizeCls,
        tone.bg,
        tone.text,
        className,
      )}
      aria-label={`Risk level ${riskLevelLabel(level)}`}
      data-risk-level={level}
    >
      {withDot ? <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden /> : null}
      {prefix ? <span className="font-medium opacity-80">{prefix}</span> : null}
      <span>{riskLevelLabel(level)}</span>
    </span>
  )
}
