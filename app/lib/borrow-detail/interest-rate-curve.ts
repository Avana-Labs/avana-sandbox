import type { InterestRateModelParams } from "@/app/lib/borrow-detail/protocol-parameters"

export type InterestRateCurvePoint = { utilization: number; apr: number }

export type InterestRateCurve = {
  points: InterestRateCurvePoint[]
  currentUtilization: number
  optimalUtilization: number
  maxApr: number
  yTicks: number[]
}

/** Round up to a 1–2–5×10^n ceiling so axis labels stay readable. */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 10
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

/** Evenly spaced Y ticks from 0 to a nice ceiling covering `maxApr`. */
export function buildPercentAxisTicks(maxApr: number, tickCount = 4): number[] {
  const top = niceCeil(maxApr)
  const steps = Math.max(2, tickCount) - 1
  const step = top / steps
  return Array.from({ length: steps + 1 }, (_, index) => Math.round(step * index * 100) / 100)
}

/** Kinked borrow APR curve from IRM params (base → optimal kink → 100% util). */
export function buildBorrowInterestRateCurve(
  currentUtilization: number,
  currentBorrowApr: number,
  irm: InterestRateModelParams,
): InterestRateCurve {
  const points: InterestRateCurvePoint[] = []
  const optimalUtilization = irm.optimalUtilizationPct
  const anchorApr = irm.baseBorrowRatePct + irm.slopeBelowOptimalPct
  const rawMax = Math.max(anchorApr + irm.slopeAboveOptimalPct, currentBorrowApr + 2, 1)
  const maxApr = niceCeil(rawMax)

  for (let util = 0; util <= 100; util += 1) {
    let apr: number
    if (util <= optimalUtilization) {
      const t = optimalUtilization === 0 ? 1 : util / optimalUtilization
      apr = irm.baseBorrowRatePct + irm.slopeBelowOptimalPct * t
    } else {
      // Reached only when util > optimalUtilization; util caps at 100 (loop bound), so
      // span = 100 - optimalUtilization is strictly > 0 here — no divide-by-zero guard
      // needed. (When optimalUtilization === 100 the util <= optimalUtilization branch
      // above claims every point.)
      const t = (util - optimalUtilization) / (100 - optimalUtilization)
      apr = anchorApr + irm.slopeAboveOptimalPct * t
    }
    points.push({ utilization: util, apr })
  }

  return {
    points,
    currentUtilization: Math.min(100, Math.max(0, currentUtilization)),
    optimalUtilization,
    maxApr,
    yTicks: buildPercentAxisTicks(maxApr),
  }
}
