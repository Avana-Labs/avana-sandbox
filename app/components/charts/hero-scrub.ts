import type { ChartPoint } from "./types"

/** Continuous scrub sample along the hero area path (not snapped to a discrete index). */
export type HeroScrubSample = {
  /** Plot X in SVG coordinates. */
  x: number
  /** Plot Y in SVG coordinates. */
  y: number
  /** Interpolated series value at this X. */
  value: number
  /** Label from the floor sample (timestamp / bucket). */
  label: string
  /** Time from the floor sample. */
  time: number
  /** Index of the segment start (floor). */
  indexFloor: number
  /** 0–1 progress within the floor→ceil segment. */
  progress: number
}

export type ScrubPlotPoint = ChartPoint & { x: number; y: number }

/**
 * Map a pointer X (relative to the chart shell) into a 0–1 plot ratio,
 * clamped to the drawable plot region.
 */
export function scrubRatioFromPointer(clientX: number, shellLeft: number, plotLeft: number, plotWidth: number): number {
  const width = Math.max(1, plotWidth)
  return Math.min(1, Math.max(0, (clientX - shellLeft - plotLeft) / width))
}

/**
 * Continuous scrub along equally spaced plot points: find the segment under
 * `ratio` and linearly interpolate value + screen Y. X follows the ratio so the
 * crosshair tracks the pointer without discrete jumps.
 */
export function interpolateScrubSample(points: ScrubPlotPoint[], ratio: number): HeroScrubSample | null {
  if (points.length === 0) return null
  if (points.length === 1) {
    const only = points[0]!
    return {
      x: only.x,
      y: only.y,
      value: only.value,
      label: only.label,
      time: only.time,
      indexFloor: 0,
      progress: 0,
    }
  }

  const clamped = Math.min(1, Math.max(0, ratio))
  const scaled = clamped * (points.length - 1)
  const indexFloor = Math.min(points.length - 2, Math.max(0, Math.floor(scaled)))
  const progress = scaled - indexFloor
  const left = points[indexFloor]!
  const right = points[indexFloor + 1]!

  return {
    x: left.x + (right.x - left.x) * progress,
    y: left.y + (right.y - left.y) * progress,
    value: left.value + (right.value - left.value) * progress,
    label: progress < 0.5 ? left.label : right.label,
    time: progress < 0.5 ? left.time : right.time,
    indexFloor,
    progress,
  }
}
