"use client"

import { buildRangeData } from "@/app/components/charts"
import type { PortfolioHeroData, PortfolioLendTabData } from "@/app/lib/data/providers/portfolio"

export type LendSnapshot = {
  totalSuppliedUsd: number
  totalEarnedUsd: number
  averageApyPct: number
  openPositions: number
}

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function buildSuppliedRangeData(totalSuppliedUsd: number) {
  return buildRangeData(totalSuppliedUsd, Math.max(totalSuppliedUsd * 0.02, 42))
}

export function buildLendSnapshotFromTabData(data: PortfolioLendTabData): LendSnapshot {
  const investments = data.investments
  const totalSuppliedUsd = investments.reduce((sum, item) => sum + item.suppliedUsd, 0)
  const totalEarnedUsd = investments.reduce((sum, item) => sum + item.earnedUsd, 0)
  const averageApyPct = investments.length
    ? investments.reduce((sum, item) => sum + item.apyPct, 0) / investments.length
    : 0

  return {
    totalSuppliedUsd,
    totalEarnedUsd,
    averageApyPct,
    openPositions: investments.length,
  }
}

export function buildLendHeroData(template: PortfolioHeroData, snapshot: LendSnapshot): PortfolioHeroData {
  const positionLabel = snapshot.openPositions === 1 ? "1 open position" : `${snapshot.openPositions} open positions`

  return {
    ...template,
    headlineValue: formatUsd(snapshot.totalSuppliedUsd),
    headlineDelta: snapshot.openPositions > 0 ? positionLabel : `${formatUsd(snapshot.totalEarnedUsd)} earned`,
    rangeData: buildSuppliedRangeData(snapshot.totalSuppliedUsd),
    statOneValue: `${snapshot.averageApyPct.toFixed(2)}%`,
    statTwoValue: formatUsd(snapshot.totalEarnedUsd),
  }
}
