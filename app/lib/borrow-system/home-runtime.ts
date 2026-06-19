import {
  applyBorrowAction,
  calculateSpokeCreditMetrics,
  currentCollateralValueUsd6,
  currentDebtValueUsd6,
  debtInterestOwedUsd6,
  formatFixed,
  mulDiv,
  parseFixed,
  type BorrowSystemState,
  type UserCollateralPosition,
  type UserDebtPosition,
} from "@/app/lib/credit-engine"
import {
  formatCompactUsd,
  formatHealthFactor,
  formatUsd,
  getRiskTone,
  type BorrowPreview,
  type HomeBorrowToken,
  type HomeCollateralPool,
  type RemovePreview,
  type RepayPreview,
} from "@/app/lib/home-sim"
import { selectBorrowCollateralPools, selectBorrowableAssets } from "./selectors"

function fixedToNumber(value: bigint, decimals: number) {
  return Number.parseFloat(formatFixed(value, decimals))
}

function healthFactorToNumber(healthFactorWad: bigint) {
  return healthFactorWad > 0n ? fixedToNumber(healthFactorWad, 18) : Number.POSITIVE_INFINITY
}

function userMessageFromError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes("no collateral")) return "Deposit compatible collateral"
  if (message.includes("not supported")) return "Unsupported in this spoke"
  if (message.includes("enough available credit") || message.includes("insolvent")) return "Exceeds borrow power"
  if (message.includes("enough liquidity")) return "Not enough liquidity"
  if (message.includes("Unknown debt position")) return "No debt selected"
  return "Action unavailable"
}

function tokenFromAssetId(state: BorrowSystemState, assetId: string): HomeBorrowToken | null {
  const asset = state.assets[assetId]
  if (!asset) return null
  return {
    id: asset.id,
    name: asset.display.name,
    symbol: asset.symbol,
    subtitle: asset.contextLabel,
    borrowApr: fixedToNumber(asset.borrowConfig.baseBorrowAprWad, 18) * 100,
    visual: {
      symbol: asset.display.visual.symbol,
      shortLabel: asset.display.visual.shortLabel,
      bgClassName: asset.display.visual.bgClassName,
      textClassName: asset.display.visual.textClassName,
    },
  }
}

function collateralPositionForMarket(state: BorrowSystemState, walletId: string, marketId: string): UserCollateralPosition | null {
  return state.accounts[walletId]?.collateralPositions.find((position) => position.marketId === marketId) ?? null
}

function debtPositionsForSpoke(state: BorrowSystemState, walletId: string, spokeId: string): UserDebtPosition[] {
  return state.accounts[walletId]?.debtPositions.filter((position) => position.spokeId === spokeId) ?? []
}

function totalSpokeDebtUsd(state: BorrowSystemState, walletId: string, spokeId: string) {
  return debtPositionsForSpoke(state, walletId, spokeId).reduce((sum, position) => sum + fixedToNumber(currentDebtValueUsd6(position), 6), 0)
}

function selectPrimaryDebtPosition(state: BorrowSystemState, walletId: string, marketId: string): UserDebtPosition | null {
  const spokeId = state.markets[marketId]?.spokeId
  if (!spokeId) return null
  return debtPositionsForSpoke(state, walletId, spokeId)
    .slice()
    .sort((left, right) => {
      const rightDebt = currentDebtValueUsd6(right)
      const leftDebt = currentDebtValueUsd6(left)
      if (rightDebt === leftDebt) return 0
      return rightDebt > leftDebt ? 1 : -1
    })[0] ?? null
}

export function selectHomeBorrowTokensForMarket(
  state: BorrowSystemState,
  walletId: string,
  marketId: string,
): HomeBorrowToken[] {
  return selectBorrowableAssets(state, walletId, marketId).map((asset) => ({
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    subtitle: asset.subtitle,
    borrowApr: asset.borrowApr,
    visual: {
      symbol: asset.visual.symbol,
      shortLabel: asset.visual.shortLabel,
      bgClassName: asset.visual.bgClass,
      textClassName: asset.visual.textClass,
    },
  }))
}

export function selectHomeDebtMap(state: BorrowSystemState, walletId: string) {
  return Object.fromEntries(
    selectBorrowCollateralPools(state, walletId).map((pool) => {
      const spokeId = state.markets[pool.id]?.spokeId
      return [pool.id, spokeId ? totalSpokeDebtUsd(state, walletId, spokeId) : 0]
    }),
  ) as Record<string, number>
}

export function selectHomeDebtContextForMarket(state: BorrowSystemState, walletId: string, marketId: string) {
  const position = selectPrimaryDebtPosition(state, walletId, marketId)
  if (!position) return null
  const token = tokenFromAssetId(state, position.assetId)
  if (!token) return null
  return {
    position,
    token,
    amountUsd: fixedToNumber(currentDebtValueUsd6(position), 6),
    interestOwedUsd: fixedToNumber(debtInterestOwedUsd6(position), 6),
    borrowApr: fixedToNumber(position.borrowRateWad, 18) * 100,
  }
}

export function buildHomeBorrowPreview(
  state: BorrowSystemState,
  walletId: string,
  marketId: string,
  assetId: string | null,
  amountUsd: number,
): BorrowPreview {
  const market = state.markets[marketId]
  if (!market) {
    throw new Error(`Unknown market ${marketId}`)
  }
  const currentMetrics = calculateSpokeCreditMetrics(state, walletId, market.spokeId)
  const currentAvailableCreditUsd = fixedToNumber(currentMetrics.availableCreditUsd6, 6)

  if (amountUsd <= 0) {
    return {
      amountUsd,
      amountLabel: "—",
      isEmpty: true,
      isValid: false,
      exceedsBorrowPower: false,
      healthFactor: null,
      healthFactorLabel: "—",
      riskTone: "neutral",
      progressPercent: 5,
      remainingBorrowPowerUsd: currentAvailableCreditUsd,
      warningTitle: null,
      warningMessage: null,
      ctaLabel: "Enter an amount",
    }
  }

  if (!assetId) {
    return {
      amountUsd,
      amountLabel: formatUsd(amountUsd),
      isEmpty: false,
      isValid: false,
      exceedsBorrowPower: false,
      healthFactor: null,
      healthFactorLabel: "—",
      riskTone: "neutral",
      progressPercent: 5,
      remainingBorrowPowerUsd: currentAvailableCreditUsd,
      warningTitle: null,
      warningMessage: null,
      ctaLabel: "Select token",
    }
  }

  try {
    const next = applyBorrowAction(state, {
      type: "borrow",
      walletId,
      marketId,
      assetId,
      amountUsd6: parseFixed(amountUsd.toFixed(6), 6),
    })
    const nextMetrics = calculateSpokeCreditMetrics(next, walletId, market.spokeId)
    const healthFactor = healthFactorToNumber(nextMetrics.healthFactorWad)
    const remainingBorrowPowerUsd = fixedToNumber(nextMetrics.availableCreditUsd6, 6)
    const riskTone = getRiskTone(healthFactor)

    return {
      amountUsd,
      amountLabel: formatUsd(amountUsd),
      isEmpty: false,
      isValid: true,
      exceedsBorrowPower: false,
      healthFactor,
      healthFactorLabel: formatHealthFactor(healthFactor),
      riskTone,
      progressPercent: currentMetrics.creditLimitUsd6 > 0n ? Math.min(100, ((amountUsd - remainingBorrowPowerUsd + currentAvailableCreditUsd) / fixedToNumber(currentMetrics.creditLimitUsd6, 6)) * 100) : 0,
      remainingBorrowPowerUsd,
      warningTitle:
        riskTone === "danger" ? "High liquidation risk" : riskTone === "warning" ? "Borrowing gets tighter" : null,
      warningMessage:
        riskTone === "danger" || riskTone === "warning"
          ? `Credit health: ${formatHealthFactor(healthFactor)}.`
          : null,
      ctaLabel: `Borrow ${amountUsd.toFixed(0)} ${state.assets[assetId]?.symbol ?? "tokens"}`,
    }
  } catch (error) {
    return {
      amountUsd,
      amountLabel: formatUsd(amountUsd),
      isEmpty: false,
      isValid: false,
      exceedsBorrowPower: true,
      healthFactor: currentMetrics.totalBorrowedUsd6 > 0n ? healthFactorToNumber(currentMetrics.healthFactorWad) : null,
      healthFactorLabel:
        currentMetrics.totalBorrowedUsd6 > 0n ? formatHealthFactor(healthFactorToNumber(currentMetrics.healthFactorWad)) : "—",
      riskTone: "danger",
      progressPercent: 100,
      remainingBorrowPowerUsd: currentAvailableCreditUsd,
      warningTitle: "Borrow unavailable",
      warningMessage: error instanceof Error ? error.message : String(error),
      ctaLabel: userMessageFromError(error),
    }
  }
}

export function buildHomeRepayPreview(
  state: BorrowSystemState,
  walletId: string,
  debtPositionId: string | null,
  amountUsd: number,
): RepayPreview {
  const debtPosition = debtPositionId
    ? state.accounts[walletId]?.debtPositions.find((position) => position.id === debtPositionId) ?? null
    : null
  const currentDebtUsd = debtPosition ? fixedToNumber(currentDebtValueUsd6(debtPosition), 6) : 0
  const spokeId = debtPosition?.spokeId
  const currentMetrics = spokeId ? calculateSpokeCreditMetrics(state, walletId, spokeId) : null
  const currentHealthFactor = currentMetrics ? healthFactorToNumber(currentMetrics.healthFactorWad) : Number.POSITIVE_INFINITY
  const borrowApr = debtPosition ? fixedToNumber(debtPosition.borrowRateWad, 18) * 100 : 0
  const exceedsDebt = amountUsd > currentDebtUsd

  if (amountUsd <= 0) {
    return {
      amountUsd,
      isEmpty: true,
      isValid: false,
      exceedsDebt: false,
      remainingDebtUsd: currentDebtUsd,
      remainingDebtLabel: formatCompactUsd(currentDebtUsd),
      healthFactorAfter: currentHealthFactor,
      healthFactorAfterLabel: formatHealthFactor(currentHealthFactor),
      oldHealthFactorLabel: formatHealthFactor(currentHealthFactor),
      riskTone: getRiskTone(currentHealthFactor),
      yearlyInterestSavedUsd: 0,
      ctaLabel: "Enter an amount",
    }
  }

  if (!debtPosition) {
    return {
      amountUsd,
      isEmpty: false,
      isValid: false,
      exceedsDebt,
      remainingDebtUsd: 0,
      remainingDebtLabel: "$0",
      healthFactorAfter: currentHealthFactor,
      healthFactorAfterLabel: formatHealthFactor(currentHealthFactor),
      oldHealthFactorLabel: formatHealthFactor(currentHealthFactor),
      riskTone: "neutral",
      yearlyInterestSavedUsd: 0,
      ctaLabel: "No debt selected",
    }
  }

  try {
    const next = applyBorrowAction(state, {
      type: "repay",
      walletId,
      debtPositionId: debtPosition.id,
      amountUsd6: parseFixed(amountUsd.toFixed(6), 6),
    })
    const nextMetrics = calculateSpokeCreditMetrics(next, walletId, debtPosition.spokeId)
    const nextPosition = next.accounts[walletId]?.debtPositions.find((position) => position.id === debtPosition.id) ?? null
    const remainingDebtUsd = nextPosition ? fixedToNumber(currentDebtValueUsd6(nextPosition), 6) : 0
    const healthFactorAfter = nextMetrics.totalBorrowedUsd6 > 0n ? healthFactorToNumber(nextMetrics.healthFactorWad) : Number.POSITIVE_INFINITY

    return {
      amountUsd,
      isEmpty: false,
      isValid: !exceedsDebt,
      exceedsDebt,
      remainingDebtUsd,
      remainingDebtLabel: `${formatCompactUsd(remainingDebtUsd)} ${state.assets[debtPosition.assetId]?.symbol ?? ""}`.trim(),
      healthFactorAfter,
      healthFactorAfterLabel: formatHealthFactor(healthFactorAfter),
      oldHealthFactorLabel: formatHealthFactor(currentHealthFactor),
      riskTone: getRiskTone(healthFactorAfter),
      yearlyInterestSavedUsd: (Math.min(amountUsd, currentDebtUsd) * borrowApr) / 100,
      ctaLabel: exceedsDebt
        ? "Exceeds debt"
        : `Repay ${formatCompactUsd(Math.min(amountUsd, currentDebtUsd))} ${state.assets[debtPosition.assetId]?.symbol ?? ""}`.trim(),
    }
  } catch (error) {
    return {
      amountUsd,
      isEmpty: false,
      isValid: false,
      exceedsDebt: amountUsd > currentDebtUsd,
      remainingDebtUsd: currentDebtUsd,
      remainingDebtLabel: formatCompactUsd(currentDebtUsd),
      healthFactorAfter: currentHealthFactor,
      healthFactorAfterLabel: formatHealthFactor(currentHealthFactor),
      oldHealthFactorLabel: formatHealthFactor(currentHealthFactor),
      riskTone: "danger",
      yearlyInterestSavedUsd: 0,
      ctaLabel: userMessageFromError(error),
    }
  }
}

export function buildHomeRemovePreview(
  state: BorrowSystemState,
  walletId: string,
  marketId: string,
  percent: number,
): RemovePreview {
  const market = state.markets[marketId]
  const position = collateralPositionForMarket(state, walletId, marketId)
  if (!market || !position) {
    throw new Error(`Unknown collateral position for ${marketId}`)
  }

  const currentMetrics = calculateSpokeCreditMetrics(state, walletId, market.spokeId)
  const currentValueUsd = fixedToNumber(currentCollateralValueUsd6(position, market), 6)
  const removeUsd = Math.round((currentValueUsd * percent) / 100)
  const afterCollateralUsd = Math.max(0, currentValueUsd - removeUsd)
  const liquidationHeadroomUsd6 =
    currentMetrics.liquidationValueUsd6 > currentMetrics.totalBorrowedUsd6
      ? currentMetrics.liquidationValueUsd6 - currentMetrics.totalBorrowedUsd6
      : 0n
  const maxRemoveUsd6 =
    currentMetrics.totalBorrowedUsd6 > 0n
      ? mulDiv(liquidationHeadroomUsd6, parseFixed("1", 18), market.riskConfig.liquidationThresholdWad)
      : currentCollateralValueUsd6(position, market)
  const safePercent = currentValueUsd > 0 ? Math.max(0, Math.min(100, Math.floor((fixedToNumber(maxRemoveUsd6, 6) / currentValueUsd) * 100))) : 0
  if (percent <= 0) {
    const currentHealthFactor = currentMetrics.totalBorrowedUsd6 > 0n ? healthFactorToNumber(currentMetrics.healthFactorWad) : Number.POSITIVE_INFINITY
    return {
      percent,
      safePercent,
      removeUsd: 0,
      afterCollateralUsd: currentValueUsd,
      healthFactorAfter: currentHealthFactor,
      healthFactorAfterLabel: formatHealthFactor(currentHealthFactor),
      riskTone: getRiskTone(currentHealthFactor),
      isUnsafe: false,
      liquidationThresholdAfterUsd: fixedToNumber(currentMetrics.liquidationValueUsd6, 6),
      ctaLabel: "Remove 0% · $0",
    }
  }

  try {
    const next = applyBorrowAction(state, {
      type: "removeCollateral",
      walletId,
      positionId: position.id,
      percentBps: percent * 100,
    })
    const nextMetrics = calculateSpokeCreditMetrics(next, walletId, market.spokeId)
    const healthFactorAfter = nextMetrics.totalBorrowedUsd6 > 0n ? healthFactorToNumber(nextMetrics.healthFactorWad) : Number.POSITIVE_INFINITY

    return {
      percent,
      safePercent,
      removeUsd,
      afterCollateralUsd,
      healthFactorAfter,
      healthFactorAfterLabel: formatHealthFactor(healthFactorAfter),
      riskTone: getRiskTone(healthFactorAfter),
      isUnsafe: false,
      liquidationThresholdAfterUsd: fixedToNumber(nextMetrics.liquidationValueUsd6, 6),
      ctaLabel: `Remove ${percent}% · ${formatCompactUsd(removeUsd)}`,
    }
  } catch (_error) {
    const currentHealthFactor = currentMetrics.totalBorrowedUsd6 > 0n ? healthFactorToNumber(currentMetrics.healthFactorWad) : Number.POSITIVE_INFINITY
    return {
      percent,
      safePercent,
      removeUsd,
      afterCollateralUsd,
      healthFactorAfter: currentHealthFactor,
      healthFactorAfterLabel: formatHealthFactor(currentHealthFactor),
      riskTone: "danger",
      isUnsafe: true,
      liquidationThresholdAfterUsd: fixedToNumber(currentMetrics.liquidationValueUsd6, 6),
      ctaLabel: `Remove ${percent}% · ${formatCompactUsd(removeUsd)}`,
    }
  }
}
