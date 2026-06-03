/**
 * Curated token price curves — smooth trend + natural micro-moves (Tokens-style).
 */

import { createPrng, hashString } from "./prng"
import type { Point, Series, TimeRangeId } from "./types"

const ETH_DAILY: Point[] = [
  { t: "2026-05-22", v: 2088.5 },
  { t: "2026-05-23", v: 2046.0 },
  { t: "2026-05-24", v: 1994.25 },
  { t: "2026-05-25", v: 1975.0 },
  { t: "2026-05-26", v: 1998.5 },
  { t: "2026-05-27", v: 2008.75 },
  { t: "2026-05-28", v: 2019.96 },
]

const CURATED_DAILY: Record<string, Point[]> = {
  eth: ETH_DAILY,
}

export function buildCuratedPriceFamily(assetId: string, label: string): Record<TimeRangeId, Series> | null {
  const daily = CURATED_DAILY[assetId]
  if (!daily) return null

  const ranges: TimeRangeId[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"]
  const out = {} as Record<TimeRangeId, Series>

  for (const range of ranges) {
    const points = buildWalkSeries(daily, range, assetId)
    out[range] = {
      id: `${assetId}:price:${range}`,
      label,
      points,
      aggregate: points.reduce((sum, p) => sum + p.v, 0) / points.length,
    }
  }

  return out
}

/** Mean-reverting random walk hugging the daily anchor curve. */
function buildWalkSeries(daily: Point[], range: TimeRangeId, assetId: string): Point[] {
  const endMs = parseTs(daily[daily.length - 1].t).getTime() + 20 * 60 * 60 * 1000
  const intervalMs =
    range === "1D"
      ? 10 * 60 * 1000
      : range === "1W"
        ? 15 * 60 * 1000
        : range === "1M"
          ? 2 * 60 * 60 * 1000
          : 6 * 60 * 60 * 1000

  const spanMs =
    range === "1D"
      ? 24 * 60 * 60 * 1000
      : range === "1W"
        ? 7 * 24 * 60 * 60 * 1000
        : range === "1M"
          ? 30 * 24 * 60 * 60 * 1000
          : range === "3M"
            ? 90 * 24 * 60 * 60 * 1000
            : range === "1Y"
              ? 365 * 24 * 60 * 60 * 1000
              : 720 * 24 * 60 * 60 * 1000

  const startMs = endMs - spanMs
  const rand = createPrng(hashString(`${assetId}:${range}:walk`))
  const stepNoise = range === "1W" ? 1.75 : range === "1D" ? 1.2 : 4.5

  let price = interpolateDaily(daily, startMs)
  const points: Point[] = []

  for (let ms = startMs; ms <= endMs; ms += intervalMs) {
    const anchor = interpolateDaily(daily, ms)
    const pull = (anchor - price) * 0.12
    const noise = (rand() - 0.5) * stepNoise
    price = price + pull + noise
    if (ms >= endMs - intervalMs) price = daily[daily.length - 1].v
    points.push({ t: new Date(ms).toISOString(), v: Math.round(price * 100) / 100 })
  }

  return points
}

function interpolateDaily(daily: Point[], ms: number): number {
  const days = daily.map((p) => ({ ms: parseTs(p.t).getTime(), v: p.v }))
  if (ms <= days[0].ms) return days[0].v
  if (ms >= days[days.length - 1].ms) return days[days.length - 1].v
  for (let i = 0; i < days.length - 1; i++) {
    const a = days[i]
    const b = days[i + 1]
    if (ms >= a.ms && ms <= b.ms) {
      const ratio = (ms - a.ms) / (b.ms - a.ms)
      return a.v + (b.v - a.v) * ratio
    }
  }
  return days[days.length - 1].v
}

function parseTs(raw: string) {
  if (raw.includes("T")) return new Date(raw)
  return new Date(`${raw.slice(0, 10)}T12:00:00Z`)
}
