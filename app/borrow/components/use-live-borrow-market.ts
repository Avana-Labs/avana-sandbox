"use client"

import { useEffect, useMemo, useState } from "react"
import { hashString } from "@/app/lib/deterministic"
import {
  BORROW_POOL_CATALOG,
  BORROW_SUPPLY_META,
  BORROWABLE_ASSETS,
  formatUsdExact,
  type BorrowPoolRow,
  type BorrowableAsset,
} from "@/app/lib/borrow-sim"
import { HOME_COLLATERAL_POOLS } from "@/app/lib/home-sim"

const REFRESH_INTERVAL_MS = 2200
const TREND_POINTS = 14

type DebtsState = Record<string, number>

type LiveSupplyMetric = {
  pairApr: number
  feesUsd: number
  feesLabel: string
  healthFactor: number | null
}

type LiveDebtMetric = {
  borrowApr: number
  healthFactor: number | null
  accruedInterestUsd: number
  dailyInterestUsd: number
}

type UseLiveBorrowMarketResult = {
  livePools: BorrowPoolRow[]
  liveAssets: BorrowableAsset[]
  liveSupplyMetrics: Record<string, LiveSupplyMetric>
  liveDebtMetrics: Record<string, LiveDebtMetric>
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function wave(seed: string, phase: number, amplitude: number) {
  const hash = hashString(seed)
  const primaryFrequency = 0.42 + (hash % 9) * 0.035
  const secondaryFrequency = 0.16 + ((hash >>> 4) % 7) * 0.028
  const primaryOffset = ((hash % 360) * Math.PI) / 180
  const secondaryOffset = ((((hash >>> 12) % 360) * Math.PI) / 180)

  return (
    Math.sin(phase * primaryFrequency + primaryOffset) * amplitude * 0.72 +
    Math.cos(phase * secondaryFrequency + secondaryOffset) * amplitude * 0.28
  )
}

function buildTrendSeries(seed: string, baseValue: number, phase: number, varianceRatio: number) {
  const magnitude = Math.max(baseValue * varianceRatio, 0.05)

  return Array.from({ length: TREND_POINTS }, (_, index) => {
    const pointPhase = phase - (TREND_POINTS - index - 1) * 0.95
    const drift = wave(`${seed}-drift`, pointPhase, magnitude)
    const echo = wave(`${seed}-echo`, pointPhase, magnitude * 0.45)
    return clamp(baseValue + drift + echo, Math.max(baseValue * 0.35, 0.01), baseValue * 1.8 + 1)
  })
}

function seriesDirection(values: number[]) {
  return (values[values.length - 1] ?? 0) >= (values[0] ?? 0)
}

function computeBaseHealthFactor(collateralUsd: number, maxLtv: number, debtUsd: number) {
  if (debtUsd <= 0) return Number.POSITIVE_INFINITY
  return (collateralUsd * (maxLtv / 100)) / debtUsd
}

export function useLiveBorrowMarket(debts: DebtsState): UseLiveBorrowMarketResult {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPhase((currentPhase) => currentPhase + 1)
    }, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [])

  const livePools = useMemo(() => {
    return BORROW_POOL_CATALOG.map((pool) => {
      const baseApr = (pool.aprMin + pool.aprMax) / 2
      const spread = Math.max(0.8, pool.aprMax - pool.aprMin)
      const currentApr = clamp(baseApr + wave(`${pool.id}-fees-apr`, phase, 0.45), 0.1, 30)
      const riskPremiumBps = Math.round(clamp(pool.riskPremiumBps + wave(`${pool.id}-risk`, phase, 11), 5, 180))
      const trendValues = buildTrendSeries(`${pool.id}-trend`, currentApr, phase, 0.085)

      return {
        ...pool,
        aprMin: Math.max(0.1, Number((currentApr - spread / 2).toFixed(2))),
        aprMax: Number((currentApr + spread / 2).toFixed(2)),
        riskPremiumBps,
        trendUp: seriesDirection(trendValues),
        trendValues,
      }
    })
  }, [phase])

  const liveAssets = useMemo(() => {
    return BORROWABLE_ASSETS.map((asset) => {
      const borrowApr = clamp(asset.borrowApr + wave(`${asset.id}-borrow-apr`, phase, 0.35), 0.1, 20)
      const trendValues = buildTrendSeries(`${asset.id}-trend`, borrowApr, phase, 0.09)

      return {
        ...asset,
        borrowApr: Number(borrowApr.toFixed(2)),
        trendUp: seriesDirection(trendValues),
        trendValues,
      }
    })
  }, [phase])

  const liveUsdcBorrowApr = liveAssets.find((asset) => asset.id === "usdc")?.borrowApr ?? BORROWABLE_ASSETS[0]?.borrowApr ?? 0

  const liveSupplyMetrics = useMemo<Record<string, LiveSupplyMetric>>(() => {
    return Object.fromEntries(
      HOME_COLLATERAL_POOLS.map((pool) => {
        const baseFeesUsd = BORROW_SUPPLY_META[pool.id]?.feesUsd ?? 0
        const baseHealthFactor = computeBaseHealthFactor(pool.collateralUsd, pool.maxLtv, debts[pool.id] ?? 0)
        const pairApr = clamp(pool.pairApr + wave(`${pool.id}-lp-apr`, phase, 0.42), 0.1, 25)
        const feesUsd = clamp(baseFeesUsd + wave(`${pool.id}-fees-earned`, phase, Math.max(baseFeesUsd * 0.12, 4)), 0, baseFeesUsd * 2.2 + 20)
        const healthFactor =
          !Number.isFinite(baseHealthFactor)
            ? baseHealthFactor
            : clamp(baseHealthFactor + wave(`${pool.id}-hf`, phase, Math.max(baseHealthFactor * 0.08, 0.06)), 0.65, 9.5)

        return [
          pool.id,
          {
            pairApr: Number(pairApr.toFixed(2)),
            feesUsd,
            feesLabel: formatUsdExact(feesUsd),
            healthFactor,
          },
        ]
      }),
    )
  }, [debts, phase])

  const liveDebtMetrics = useMemo<Record<string, LiveDebtMetric>>(() => {
    return Object.fromEntries(
      HOME_COLLATERAL_POOLS.filter((pool) => (debts[pool.id] ?? 0) > 0).map((pool) => {
        const borrowedUsd = debts[pool.id] ?? 0
        const baseAccrued = BORROW_SUPPLY_META[pool.id]?.accruedInterestUsd ?? 0
        const accruedInterestUsd = clamp(
          baseAccrued + wave(`${pool.id}-accrued-interest`, phase, Math.max(baseAccrued * 0.18, 3)),
          0,
          baseAccrued * 2.4 + 24,
        )
        const borrowApr = Number(liveUsdcBorrowApr.toFixed(2))
        const dailyInterestUsd = (borrowedUsd * (borrowApr / 100)) / 365

        return [
          pool.id,
          {
            borrowApr,
            healthFactor: liveSupplyMetrics[pool.id]?.healthFactor ?? computeBaseHealthFactor(pool.collateralUsd, pool.maxLtv, borrowedUsd),
            accruedInterestUsd,
            dailyInterestUsd,
          },
        ]
      }),
    )
  }, [debts, liveSupplyMetrics, liveUsdcBorrowApr, phase])

  return {
    livePools,
    liveAssets,
    liveSupplyMetrics,
    liveDebtMetrics,
  }
}
