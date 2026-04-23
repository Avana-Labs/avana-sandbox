"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { RiskLevel } from "@/app/lib/borrow-detail"

type RiskGaugeProps = {
  /** Score 0..100 (higher = riskier). */
  score: number
  level: RiskLevel
  /** Optional headline e.g. "Moderate risk" shown under the needle. */
  label?: string
  /** Overall gauge width in px. */
  size?: number
  className?: string
}

const LEVEL_COLOR: Record<RiskLevel, string> = {
  low: "text-emerald-500",
  moderate: "text-amber-500",
  elevated: "text-orange-500",
  high: "text-rose-500",
}

/**
 * Half-circle gauge. Renders 4 colored segments + a needle at `score`.
 * Accepts any score in [0..100] and clamps at the bounds for display.
 */
export function RiskGauge({ score, level, label, size = 220, className }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score))
  const radius = 86
  const cx = 110
  const cy = 108
  const angleFor = (v: number) => Math.PI * (1 - v / 100)
  const toXY = (angle: number, r: number) => [cx + Math.cos(angle) * r, cy - Math.sin(angle) * r] as const
  const segments: Array<{ from: number; to: number; cls: string }> = [
    { from: 0, to: 25, cls: "stroke-emerald-500" },
    { from: 25, to: 55, cls: "stroke-amber-500" },
    { from: 55, to: 80, cls: "stroke-orange-500" },
    { from: 80, to: 100, cls: "stroke-rose-500" },
  ]

  const needleAngle = angleFor(clamped)
  const [nx, ny] = toXY(needleAngle, radius - 10)

  return (
    <figure
      role="img"
      aria-label={`Risk gauge: ${clamped} out of 100 (${level})`}
      className={cn("flex flex-col items-center", className)}
      data-risk-score={clamped}
      data-risk-level={level}
    >
      <svg width={size} height={size * 0.65} viewBox="0 0 220 130">
        {segments.map((seg) => {
          const [x1, y1] = toXY(angleFor(seg.from), radius)
          const [x2, y2] = toXY(angleFor(seg.to), radius)
          const largeArc = seg.to - seg.from > 50 ? 1 : 0
          return (
            <path
              key={`${seg.from}-${seg.to}`}
              d={`M${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
              className={cn("fill-none", seg.cls)}
              strokeWidth={12}
              strokeLinecap="round"
              opacity={0.9}
            />
          )
        })}
        <line x1={cx} y1={cy} x2={nx.toFixed(2)} y2={ny.toFixed(2)} strokeWidth={3} strokeLinecap="round" className="stroke-foreground" />
        <circle cx={cx} cy={cy} r={4} className="fill-foreground" />
      </svg>
      <figcaption className="-mt-1 flex flex-col items-center">
        <span className={cn("font-data text-3xl font-bold tabular-nums", LEVEL_COLOR[level])}>{clamped}</span>
        {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      </figcaption>
    </figure>
  )
}
