"use client"

import { buildRangeData } from "@/app/components/charts"
import type { PortfolioHeroData } from "@/app/lib/data/providers/portfolio"

export type BorrowSnapshot = {
  approvedUsd: number
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
    headlineMeta: "Approved credit",
    rangeData: buildApprovedCreditRangeData(snapshot.approvedUsd),
    actionLabels: template.actionLabels.length ? template.actionLabels : ["Borrow", "Repay", "Deposit", "Withdraw"],
    primaryActionLabel: template.primaryActionLabel,
    secondaryActionLabel: template.secondaryActionLabel,
    statOneLabel: template.statOneLabel ?? "Current borrowed",
    statOneValue: formatUsd(snapshot.totalBorrowedUsd),
    statOneHelpText: template.statOneHelpText ?? "Open debt across active borrow positions.",
    statTwoLabel: template.statTwoLabel ?? "Credit health",
    statTwoValue: snapshot.averageHealthFactor == null ? "—" : snapshot.averageHealthFactor.toFixed(2),
    statTwoHelpText: template.statTwoHelpText ?? "Average health factor across active borrow-linked collateral.",
  }
}
