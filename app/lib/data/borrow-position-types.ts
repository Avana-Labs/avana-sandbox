import type { HomeCollateralPool } from "@/app/lib/data/borrow-domain"

export type DebtRowContext = {
  id?: string
  pool: HomeCollateralPool
  borrowedUsd: number
  liquidationThresholdUsd: number
  healthFactor: number | null
  borrowApr: number
  accruedInterestUsd: number
  dailyInterestUsd: number
}

export type SupplyRowContext = {
  pool: HomeCollateralPool
  borrowedUsd: number
  remainingBorrowPowerUsd: number
  liquidationThresholdUsd: number
  healthFactor: number | null
  pairApr: number
  feesUsd: number
  feesLabel: string
}
