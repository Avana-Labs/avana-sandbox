"use client"

import type { ChartRangeData } from "@/app/components/charts"
import { buildRangeData } from "@/app/components/charts"
import type { PortfolioHeroData, PortfolioLendTabData } from "@/app/lib/data/providers/portfolio"
import { buildLendRangeData } from "@/app/lib/lend-system/read-model"

export type LendSnapshot = {
  totalSuppliedUsd: number
  totalEarnedUsd: number
  averageApyPct: number
  openPositions: number
  rangeData: ChartRangeData
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
  const investments = data.investments ?? []
  const normalizedData: PortfolioLendTabData = {
    investments,
    positions: data.positions ?? investments,
    strategyBuckets: data.strategyBuckets ?? [],
    history: data.history ?? [],
    rewardsSummary: data.rewardsSummary,
  }
  const totalSuppliedUsd = investments.reduce((sum, item) => sum + item.suppliedUsd, 0)
  const totalEarnedUsd = data.rewardsSummary?.totalEarnedUsd ?? investments.reduce((sum, item) => sum + item.earnedUsd, 0)
  const averageApyPct = investments.length
    ? investments.reduce((sum, item) => sum + item.apyPct, 0) / investments.length
    : 0

  return {
    totalSuppliedUsd,
    totalEarnedUsd,
    averageApyPct,
    openPositions: investments.length,
    rangeData: buildLendRangeData(normalizedData),
  }
}

export function buildLendHeroData(template: PortfolioHeroData, snapshot: LendSnapshot): PortfolioHeroData {
  const positionLabel = snapshot.openPositions === 1 ? "1 open position" : `${snapshot.openPositions} open positions`

  return {
    ...template,
    headlineValue: formatUsd(snapshot.totalSuppliedUsd),
    headlineDelta: snapshot.openPositions > 0 ? positionLabel : `${formatUsd(snapshot.totalEarnedUsd)} earned`,
    rangeData: snapshot.rangeData ?? buildSuppliedRangeData(snapshot.totalSuppliedUsd),
    statOneValue: `${snapshot.averageApyPct.toFixed(2)}%`,
    statTwoValue: formatUsd(snapshot.totalEarnedUsd),
  }
}
