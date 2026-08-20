import { calculateSimpleInterestAccrued, calculateTotalApy } from "@/app/lib/lend-engine"
import { calculateMultiplyHealthFactor, calculateMultiplyLtv } from "@/app/lib/multiply-engine"
import { derivePersistedUmbrellaPositionStatus } from "@/app/lib/umbrella-system/portfolio-mapper"
import { liquidationThresholdPctFromMaxLtvPct } from "@/app/lib/borrow-system/liquidation-threshold"

const USD6 = 1_000_000
const WAD = 1_000_000_000_000_000_000

export function decodeBorrowRiskSnapshot(snapshot: {
  collateralValueUsd6: string
  borrowCapacityUsd6: string
  availableBorrowCapacityUsd6: string
  totalBorrowedUsd6: string
  currentLtvWad: string
  healthFactorWad: string | null
}) {
  return {
    collateralValueUsd: Number(snapshot.collateralValueUsd6) / USD6,
    borrowCapacityUsd: Number(snapshot.borrowCapacityUsd6) / USD6,
    availableBorrowCapacityUsd: Number(snapshot.availableBorrowCapacityUsd6) / USD6,
    totalBorrowedUsd: Number(snapshot.totalBorrowedUsd6) / USD6,
    currentLtv: Number(snapshot.currentLtvWad) / WAD,
    healthFactor: snapshot.healthFactorWad === null ? null : Number(snapshot.healthFactorWad) / WAD,
  }
}

export function calculateLendProjection(params: {
  principalUsd: number
  supplyApyPct: number
  rewardsApyPct?: number
  days: number
}) {
  const totalApy = calculateTotalApy(params.supplyApyPct / 100, (params.rewardsApyPct ?? 0) / 100)
  const elapsedYears = Math.max(0, params.days) / 365
  return {
    totalApyPct: totalApy * 100,
    projectedYieldUsd: calculateSimpleInterestAccrued(params.principalUsd, totalApy, elapsedYears),
    days: Math.max(0, params.days),
  }
}

export function calculateMultiplyStress(params: {
  collateralValueUsd: number
  debtValueUsd: number
  liquidationThresholdPct: number
  collateralPriceShockPct: number
}) {
  const shockedCollateralValueUsd = Math.max(0, params.collateralValueUsd * (1 + params.collateralPriceShockPct / 100))
  const liquidationThreshold = params.liquidationThresholdPct / 100
  return {
    collateralPriceShockPct: params.collateralPriceShockPct,
    shockedCollateralValueUsd,
    ltv: calculateMultiplyLtv(params.debtValueUsd, shockedCollateralValueUsd),
    healthFactor: calculateMultiplyHealthFactor(shockedCollateralValueUsd, params.debtValueUsd, liquidationThreshold),
  }
}

export function calculateAskAIBorrowSimulation(params: {
  collateralValueUsd: number
  debtValueUsd: number
  additionalBorrowAmountUsd: number
  maxLtvPct: number
  liquidationThresholdPct?: number
}) {
  const liquidationThresholdPct =
    params.liquidationThresholdPct ?? liquidationThresholdPctFromMaxLtvPct(params.maxLtvPct)
  const projectedDebtValueUsd = params.debtValueUsd + params.additionalBorrowAmountUsd
  const ratio = (debt: number) => (params.collateralValueUsd > 0 ? debt / params.collateralValueUsd : 0)
  const health = (debt: number) =>
    debt > 0 ? (params.collateralValueUsd * (liquidationThresholdPct / 100)) / debt : null
  const maxDebtUsd = params.collateralValueUsd * (params.maxLtvPct / 100)
  const projectedHealthFactor = health(projectedDebtValueUsd)
  return {
    current: {
      collateralValueUsd: params.collateralValueUsd,
      debtValueUsd: params.debtValueUsd,
      ltv: ratio(params.debtValueUsd),
      healthFactor: health(params.debtValueUsd),
    },
    projected: {
      collateralValueUsd: params.collateralValueUsd,
      debtValueUsd: projectedDebtValueUsd,
      ltv: ratio(projectedDebtValueUsd),
      healthFactor: projectedHealthFactor,
    },
    maxLtvPct: params.maxLtvPct,
    liquidationThresholdPct,
    remainingBorrowCapacityUsd: Math.max(0, maxDebtUsd - projectedDebtValueUsd),
    overMaxBorrowLtv: projectedDebtValueUsd > maxDebtUsd,
    liquidatable: projectedHealthFactor !== null && projectedHealthFactor <= 1,
    riskLevel:
      projectedHealthFactor === null
        ? ("low" as const)
        : projectedHealthFactor <= 1
          ? ("critical" as const)
          : projectedHealthFactor < 1.5
            ? ("elevated" as const)
            : ("low" as const),
  }
}

export function deriveAskAIUmbrellaStatus(position: {
  status: "open" | "closed"
  suppliedUsd6?: string
  cooldownAmountUsd6?: string
  cooldownEndsAt?: number
  withdrawalWindowEndsAt?: number
  slashedAmountUsd6?: string
  now: number
}) {
  return derivePersistedUmbrellaPositionStatus(position)
}
