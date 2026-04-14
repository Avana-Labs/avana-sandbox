import {
  buildSparklineAreaPath,
  buildSparklineLinePath,
  buildSparklinePoints,
  getSparklineColor,
  getSparklineGradientId,
} from "@/app/lib/sparkline"

type StaticSparklineProps = {
  seed: string
  isPositive: boolean
  className?: string
  points?: number
  height?: number
}

/** Server-rendered sparkline used for above-the-fold summaries that do not need client hydration. */
export function StaticSparkline({
  seed,
  isPositive,
  className = "",
  points = 12,
  height = 40,
}: StaticSparklineProps) {
  const graphPoints = buildSparklinePoints(points, isPositive, seed)
  const linePath = buildSparklineLinePath(graphPoints)
  const areaPath = buildSparklineAreaPath(linePath)
  const color = getSparklineColor(isPositive)
  const gradientId = getSparklineGradientId(seed, isPositive)

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
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
