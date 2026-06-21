"use client"

import { buildRangeData } from "@/app/components/charts"
import type { PortfolioHeroData, PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"

export type MultiplyHeroSnapshot = {
  totalExposureUsd: number
  totalBorrowedUsd: number
  averageHealthFactor: number | null
  currentLtvPct: number
  openPositions: number
  averageNetCarryPct: number
  rangeData: ReturnType<typeof buildRangeData>
}

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function buildMultiplyRangeData(totalExposureUsd: number) {
  return buildRangeData(totalExposureUsd, Math.max(totalExposureUsd * 0.025, 60))
}

export function buildMultiplySnapshotFromTabData(data: PortfolioMultiplyTabData): MultiplyHeroSnapshot {
  const openPositions = data.positions.length || data.lpCollaterals.length
  const averageNetCarryPct = data.lpCollaterals.length
    ? data.lpCollaterals.reduce((sum, item) => sum + item.netApyPct, 0) / data.lpCollaterals.length
    : data.positions.length
      ? data.positions.reduce((sum, item) => sum + item.pnlPct, 0) / data.positions.length
      : 0

  return {
    totalExposureUsd: data.creditLines.totalCollateralUsd,
    totalBorrowedUsd: data.creditLines.totalBorrowedUsd,
    averageHealthFactor: data.creditLines.averageHealthFactor,
    currentLtvPct: data.creditLines.currentLtvPct,
    openPositions,
    averageNetCarryPct,
    rangeData: buildMultiplyRangeData(data.creditLines.totalCollateralUsd),
  }
}

export function buildMultiplyHeroData(template: PortfolioHeroData, snapshot: MultiplyHeroSnapshot): PortfolioHeroData {
  return {
    ...template,
    headlineValue: formatUsd(snapshot.totalExposureUsd),
    headlineDelta:
      snapshot.averageHealthFactor == null ? "— health factor" : `${snapshot.averageHealthFactor.toFixed(2)} health factor`,
    rangeData: snapshot.rangeData,
    statOneValue: snapshot.openPositions.toString(),
    statTwoValue: `${snapshot.averageNetCarryPct.toFixed(2)}%`,
  }
}
