import {
  currentCollateralValueUsd6,
  currentDebtValueUsd6,
  formatFixed,
  parseFixed,
  simulateBorrow,
  simulateLiquidation,
  simulateRepay,
  simulateWithdraw,
  type BorrowSystemState,
} from "@/app/lib/credit-engine"

function fixedToNumber(value: bigint, decimals: number) {
  return Number.parseFloat(formatFixed(value, decimals))
}

function healthFactorToNumber(value: bigint | null) {
  return value == null ? null : fixedToNumber(value, 18)
}

export function buildBorrowPreviewModel(
  state: BorrowSystemState,
  walletId: string,
  marketId: string,
  assetId: string | null,
  amountUsd: number,
) {
  if (amountUsd <= 0 || !assetId) {
    return {
      isEmpty: amountUsd <= 0,
      isValid: false,
      exceedsBorrowPower: false,
      healthFactor: null as number | null,
      remainingBorrowPowerUsd: 0,
      progressPercent: 5,
      warningMessage: null as string | null,
    }
  }

  const preview = simulateBorrow(state, {
    type: "borrow",
    walletId,
    marketId,
    assetId,
    amountUsd6: parseFixed(amountUsd.toFixed(6), 6),
  })

    return {
      isEmpty: false,
      isValid: preview.allowed,
      exceedsBorrowPower: !preview.allowed,
      healthFactor: healthFactorToNumber(preview.after.metrics.healthFactorWad),
      remainingBorrowPowerUsd: fixedToNumber(preview.after.metrics.availableBorrowCapacityUsd6, 6),
      progressPercent:
      preview.before.metrics.borrowCapacityUsd6 > 0n
        ? Math.min(100, (fixedToNumber(preview.after.metrics.totalBorrowedUsd6, 6) / fixedToNumber(preview.before.metrics.borrowCapacityUsd6, 6)) * 100)
        : 0,
      warningMessage: preview.validationErrors[0] ?? preview.warnings[0] ?? null,
    }
}

export function buildRepayPreviewModel(
  state: BorrowSystemState,
  walletId: string,
  debtPositionId: string | null,
  amountUsd: number,
) {
  const debtPosition = debtPositionId ? state.accounts[walletId]?.debtPositions.find((position) => position.id === debtPositionId) ?? null : null
  const currentDebtUsd = debtPosition ? fixedToNumber(currentDebtValueUsd6(debtPosition), 6) : 0

  if (amountUsd <= 0 || !debtPosition) {
    return {
      isEmpty: amountUsd <= 0,
      isValid: false,
      exceedsDebt: amountUsd > currentDebtUsd,
      remainingDebtUsd: currentDebtUsd,
      healthFactorAfter: null as number | null,
      yearlyInterestSavedUsd: 0,
      warningMessage: debtPosition ? null : "No debt selected",
    }
  }

  const preview = simulateRepay(state, {
    type: "repay",
    walletId,
    debtPositionId: debtPosition.id,
    amountUsd6: parseFixed(amountUsd.toFixed(6), 6),
  })
  const nextPosition = preview.after.state.accounts[walletId]?.debtPositions.find((position) => position.id === debtPosition.id) ?? null

  return {
    isEmpty: false,
    isValid: preview.allowed && amountUsd <= currentDebtUsd,
    exceedsDebt: amountUsd > currentDebtUsd,
    remainingDebtUsd: nextPosition ? fixedToNumber(currentDebtValueUsd6(nextPosition), 6) : 0,
    healthFactorAfter: healthFactorToNumber(preview.after.metrics.healthFactorWad),
      yearlyInterestSavedUsd: debtPosition ? (Math.min(amountUsd, currentDebtUsd) * fixedToNumber(debtPosition.borrowRateWad, 18) * 100) / 100 : 0,
      warningMessage: preview.validationErrors[0] ?? preview.warnings[0] ?? null,
    }
}

export function buildWithdrawPreviewModel(
  state: BorrowSystemState,
  walletId: string,
  marketId: string,
  percent: number,
) {
  const position = state.accounts[walletId]?.collateralPositions.find((entry) => entry.marketId === marketId) ?? null
  const market = state.markets[marketId]
  if (!position || !market || percent <= 0) {
    return {
      isUnsafe: false,
      healthFactorAfter: null as number | null,
      removeUsd: 0,
      afterCollateralUsd: position && market ? fixedToNumber(currentCollateralValueUsd6(position, market), 6) : 0,
      warningMessage: null as string | null,
    }
  }

  const currentCollateralUsd = fixedToNumber(currentCollateralValueUsd6(position, market), 6)
  const preview = simulateWithdraw(state, {
    type: "removeCollateral",
    walletId,
    positionId: position.id,
    percentBps: percent * 100,
  })

  return {
    isUnsafe: !preview.allowed,
    healthFactorAfter: healthFactorToNumber(preview.after.metrics.healthFactorWad),
    removeUsd: Math.round((currentCollateralUsd * percent) / 100),
    afterCollateralUsd: fixedToNumber(preview.after.metrics.collateralValueUsd6, 6),
    warningMessage: preview.validationErrors[0] ?? preview.warnings[0] ?? null,
  }
}

export function buildLiquidationPreviewModel(
  state: BorrowSystemState,
  walletId: string,
  positionId: string,
  debtPositionId: string | null,
  amountUsd: number,
) {
  const preview = simulateLiquidation(state, {
    type: "liquidate",
    walletId,
    positionId,
    debtPositionId: debtPositionId ?? undefined,
    repayAmountUsd6: parseFixed(amountUsd.toFixed(6), 6),
  })

  return {
    allowed: preview.allowed,
    riskLabel: preview.riskLabel,
    validationErrors: preview.validationErrors,
    warnings: preview.warnings,
    beforeBorrowedUsd: fixedToNumber(preview.before.metrics.totalBorrowedUsd6, 6),
    afterBorrowedUsd: fixedToNumber(preview.after.metrics.totalBorrowedUsd6, 6),
  }
}
