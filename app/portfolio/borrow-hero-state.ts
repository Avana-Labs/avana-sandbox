"use client"

import { buildRangeData } from "@/app/components/charts"
import type { PortfolioHeroData } from "@/app/lib/data/providers/portfolio"

export type BorrowSnapshot = {
  approvedUsd: number
  liquidationThresholdUsd: number
  totalBorrowedUsd: number
  totalCollateralUsd: number
  averageHealthFactor: number | null
  currentLtvPct: number
}

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function buildApprovedCreditRangeData(approvedUsd: number) {
  return buildRangeData(approvedUsd, Math.max(approvedUsd * 0.03, 750))
}

export function buildBorrowHeroData(template: PortfolioHeroData, snapshot: BorrowSnapshot): PortfolioHeroData {
  return {
    ...template,
    headlineValue: formatUsd(snapshot.approvedUsd),
    headlineDelta: `${snapshot.currentLtvPct.toFixed(2)}% current LTV`,
    rangeData: buildApprovedCreditRangeData(snapshot.approvedUsd),
    statOneValue: formatUsd(snapshot.totalBorrowedUsd),
    statTwoValue: snapshot.averageHealthFactor == null ? "—" : snapshot.averageHealthFactor.toFixed(2),
  }
}
