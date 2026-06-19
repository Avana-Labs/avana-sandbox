import { applyBorrowAction } from "./actions"
import {
  calculateBorrowCapacityUsd6,
  calculateCreditMetrics,
  calculateCurrentLtvWad,
  calculateHealthFactorWad,
} from "./metrics"
import type { BorrowAction, BorrowSystemState } from "./types"
import { calculateCollateralValueUsd6 } from "./valuation"

export type SimulationRiskLabel = "safe" | "warning" | "danger"

export type SimulationMetrics = {
  collateralValueUsd6: bigint
  borrowCapacityUsd6: bigint
  availableBorrowCapacityUsd6: bigint
  totalBorrowedUsd6: bigint
  currentLtvWad: bigint
  healthFactorWad: bigint | null
}

export type SimulationSnapshot = {
  state: BorrowSystemState
  metrics: SimulationMetrics
}

export type BorrowSimulationResult = {
  actionType: BorrowAction["type"]
  allowed: boolean
  warnings: string[]
  validationErrors: string[]
  riskLabel: SimulationRiskLabel
  before: SimulationSnapshot
  after: SimulationSnapshot
}

function snapshot(state: BorrowSystemState, walletId: string): SimulationSnapshot {
  const metrics = calculateCreditMetrics(state, walletId)
  return {
    state,
    metrics: {
      collateralValueUsd6: calculateCollateralValueUsd6(state, walletId),
      borrowCapacityUsd6: calculateBorrowCapacityUsd6(state, walletId),
      availableBorrowCapacityUsd6: metrics.availableCreditUsd6,
      totalBorrowedUsd6: metrics.totalBorrowedUsd6,
      currentLtvWad: calculateCurrentLtvWad(state, walletId),
      healthFactorWad: calculateHealthFactorWad(state, walletId),
    },
  }
}

function labelRisk(healthFactorWad: bigint | null): SimulationRiskLabel {
  if (healthFactorWad == null) return "safe"
  if (healthFactorWad < 1_000000000000000000n) return "danger"
  if (healthFactorWad < 1_500000000000000000n) return "warning"
  return "safe"
}

function warningsFromSnapshot(actionType: BorrowAction["type"], after: SimulationSnapshot) {
  if (actionType === "claim") {
    return []
  }
  const warnings: string[] = []
  const healthFactor = after.metrics.healthFactorWad
  if (healthFactor != null && healthFactor < 1_500000000000000000n) {
    warnings.push(`${actionType} leaves the position close to liquidation`)
  }
  return warnings
}

function previewAction<TAction extends BorrowAction>(state: BorrowSystemState, action: TAction): BorrowSimulationResult {
  const before = snapshot(state, action.walletId)

  try {
    const nextState = applyBorrowAction(state, action)
    const after = snapshot(nextState, action.walletId)
    return {
      actionType: action.type,
      allowed: true,
      warnings: warningsFromSnapshot(action.type, after),
      validationErrors: [],
      riskLabel: labelRisk(after.metrics.healthFactorWad),
      before,
      after,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      actionType: action.type,
      allowed: false,
      warnings: [],
      validationErrors: [message],
      riskLabel: labelRisk(before.metrics.healthFactorWad),
      before,
      after: before,
    }
  }
}

export function simulateDeposit(state: BorrowSystemState, action: Extract<BorrowAction, { type: "supplyCollateral" }>) {
  return previewAction(state, action)
}

export function simulateBorrow(state: BorrowSystemState, action: Extract<BorrowAction, { type: "borrow" }>) {
  return previewAction(state, action)
}

export function simulateRepay(state: BorrowSystemState, action: Extract<BorrowAction, { type: "repay" }>) {
  return previewAction(state, action)
}

export function simulateWithdraw(state: BorrowSystemState, action: Extract<BorrowAction, { type: "removeCollateral" }>) {
  return previewAction(state, action)
}

export function simulateLiquidation(state: BorrowSystemState, action: Extract<BorrowAction, { type: "liquidate" }>) {
  return previewAction(state, action)
}

export function simulateClaim(state: BorrowSystemState, action: Extract<BorrowAction, { type: "claim" }>) {
  return previewAction(state, action)
}
