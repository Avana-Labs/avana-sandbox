"use client"

import { useId, useMemo } from "react"
import { DeferredRender } from "@/app/components/deferred-render"
import {
  buildSparklineAreaPath,
  buildSparklineLinePath,
  buildSparklinePoints,
  getSparklineColor,
  getSparklineGradientId,
} from "@/app/lib/sparkline"

interface EnhancedGraphProps {
  isPositive: boolean
  className?: string
  points?: number
  height?: number
  seed?: string
}

function StaticGraph({
  isPositive,
  className = "",
  points = 12,
  height = 40,
  seed,
}: EnhancedGraphProps) {
  const graphId = useId()
  const graphSeed = seed ?? `${graphId}-${isPositive ? "positive" : "negative"}-${points}`
  const graphPoints = useMemo(() => buildSparklinePoints(points, isPositive, graphSeed), [graphSeed, isPositive, points])
  const linePath = useMemo(() => buildSparklineLinePath(graphPoints), [graphPoints])
  const areaPath = useMemo(() => buildSparklineAreaPath(linePath), [linePath])
  const color = getSparklineColor(isPositive)
  const gradientId = getSparklineGradientId(graphSeed, isPositive)

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradientId})`} opacity="0.9" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function GraphSkeleton({ className = "", height = 40 }: Pick<EnhancedGraphProps, "className" | "height">) {
  return (
    <div className={`w-full rounded-md bg-muted/70 ${className}`} style={{ height }}>
      <div className="h-full w-full animate-pulse rounded-md bg-gradient-to-r from-transparent via-background/60 to-transparent" />
    </div>
  )
}

/** Lightweight sparkline that only mounts once its card is near the viewport. */
export function EnhancedGraph(props: EnhancedGraphProps) {
  return (
    <DeferredRender fallback={<GraphSkeleton className={props.className} height={props.height} />}>
      <StaticGraph {...props} />
    </DeferredRender>
  )
}
