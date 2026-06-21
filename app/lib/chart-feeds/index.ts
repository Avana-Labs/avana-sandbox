/**
 * Central chart data layer.
 *
 * Every hero chart on the platform (portfolio, borrow pool, borrow asset)
 * reads its data from one of the `get*HeroFeed` functions below. They all
 * return the same `ChartFeed` contract that the universal `MarketHeroChart`
 * renders.
 *
 * Today these return deterministic mock data generated from a seed so the UI
 * is stable and each entity looks distinct. When the API is ready, swap the
 * body of each function for a fetch that maps the response into a `ChartFeed`
 * — nothing in the UI layer needs to change.
 */

import { buildRangeData, formatChartValue, type ChartFeed, type ChartValueFormat } from "@/app/components/charts"

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date())
}

function deltaTone(pct: number): "positive" | "negative" {
  return pct < 0 ? "negative" : "positive"
}

export type LiveChartInput = {
  baseValue: number
  changePct?: number
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export type PortfolioFeedInput = {
  /** Pre-formatted balance, e.g. "$883.74". */
  balance: string
  /** Pre-formatted delta, e.g. "$6.89 (0.78%) today". */
  delta: string
  chartBase: number
  chartVariance: number
}

/** @swap-to-api Replace with `GET /portfolio/{wallet}/chart?network=…`. */
export function getPortfolioHeroFeed(input: PortfolioFeedInput): ChartFeed {
  return {
    headlineValue: input.balance,
    headlineDelta: input.delta,
    deltaTone: input.delta.includes("-") ? "negative" : "positive",
    rangeData: buildRangeData(input.chartBase, input.chartVariance),
    valueFormat: "usd",
  }
}

// ---------------------------------------------------------------------------
// Borrow — pool (TVL)
// ---------------------------------------------------------------------------

/** @swap-to-api Replace with `GET /pools/{poolId}/chart`. */
export function getPoolHeroFeed(poolId: string, live?: LiveChartInput): ChartFeed {
  const seed = hashString(poolId)
  const base = live?.baseValue ?? 40_000_000 + (seed % 720) * 1_000_000
  const variance = base * 0.05
  const pct = live?.changePct ?? (seed % 900) / 100 - 4
  const format: ChartValueFormat = "usdCompact"

  return {
    headlineValue: formatChartValue(format, base),
    headlineDelta: `${Math.abs(pct).toFixed(2)}%`,
    deltaTone: deltaTone(pct),
    headlineMeta: todayLabel(),
    rangeData: buildRangeData(base, variance),
    valueFormat: format,
  }
}

// ---------------------------------------------------------------------------
// Multiply — market (TVL)
// ---------------------------------------------------------------------------

/** @swap-to-api Replace with `GET /multiply/markets/{marketId}/chart`. */
export function getMultiplyMarketHeroFeed(marketId: string, live?: LiveChartInput): ChartFeed {
  const seed = hashString(`multiply:${marketId}`)
  const base = live?.baseValue ?? 2_000_000 + (seed % 280) * 150_000
  const variance = base * 0.065
  const pct = live?.changePct ?? (seed % 1_100) / 100 - 5.5

  return {
    headlineValue: formatChartValue("usdCompact", base),
    headlineDelta: `${Math.abs(pct).toFixed(2)}%`,
    deltaTone: deltaTone(pct),
    headlineMeta: todayLabel(),
    rangeData: buildRangeData(base, variance),
    valueFormat: "usdCompact",
  }
}

// ---------------------------------------------------------------------------
// Borrow — asset (price)
// ---------------------------------------------------------------------------

/** @swap-to-api Replace with `GET /assets/{assetId}/chart`. */
export function getAssetHeroFeed(assetId: string, live?: LiveChartInput): ChartFeed {
  const seed = hashString(assetId)
  const tier = seed % 4
  const fallbackBase =
    tier === 0 ? 1 + (seed % 50) / 1000 : tier === 1 ? 20 + (seed % 400) : tier === 2 ? 1500 + (seed % 1200) : 60_000 + (seed % 9000)
  const base = live?.baseValue ?? fallbackBase
  const variance = base * 0.045
  const pct = live?.changePct ?? (seed % 700) / 100 - 3
  const format: ChartValueFormat = "price"

  return {
    headlineValue: formatChartValue(format, base),
    headlineDelta: `${Math.abs(pct).toFixed(2)}%`,
    deltaTone: deltaTone(pct),
    headlineMeta: todayLabel(),
    rangeData: buildRangeData(base, variance),
    valueFormat: format,
  }
}
