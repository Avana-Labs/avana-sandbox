import { accrueBorrowSystemState } from "./accrue"
import { calculateCreditMetrics } from "./metrics"
import type { BorrowAction, BorrowSystemState } from "./types"
import { TOKEN_SCALE, WAD, assetsToShares, mulDiv } from "./units"
import { currentCollateralValueUsd6, currentDebtValueUsd6, debtInterestOwedUsd6 } from "./valuation"

function cloneState(state: BorrowSystemState): BorrowSystemState {
  return {
    ...state,
    markets: Object.fromEntries(Object.entries(state.markets).map(([id, market]) => [id, { ...market, snapshot: { ...market.snapshot } }])),
    assets: Object.fromEntries(Object.entries(state.assets).map(([id, asset]) => [id, { ...asset, snapshot: { ...asset.snapshot }, borrowConfig: { ...asset.borrowConfig } }])),
    accounts: Object.fromEntries(
      Object.entries(state.accounts).map(([id, account]) => [
        id,
        {
          ...account,
          collateralPositions: account.collateralPositions.map((position) => ({ ...position })),
          debtPositions: account.debtPositions.map((position) => ({ ...position })),
        },
      ]),
    ),
    transactions: [...state.transactions],
  }
}

function syncBorrowRates(state: BorrowSystemState, walletId: string) {
  const account = state.accounts[walletId]
  if (!account || account.debtPositions.length === 0) return
  const metrics = calculateCreditMetrics(state, walletId)
  account.debtPositions = account.debtPositions.map((position) => ({
    ...position,
    borrowRateWad: state.assets[position.assetId]!.borrowConfig.baseBorrowAprWad + metrics.riskPremiumWad,
  }))
}

function usd6ToTokenAmount(amountUsd6: bigint, lpTokenPriceUsd6: bigint) {
  return mulDiv(amountUsd6, TOKEN_SCALE, lpTokenPriceUsd6)
}

function applyBorrowDebtAction(state: BorrowSystemState, action: Extract<BorrowAction, { type: "borrow" }>) {
  const market = state.markets[action.marketId]
  const asset = state.assets[action.assetId]
  const account = state.accounts[action.walletId]

  if (!market) throw new Error(`Unknown market ${action.marketId}`)
  if (!asset) throw new Error(`Unknown asset ${action.assetId}`)
  if (!account) throw new Error(`Unknown wallet ${action.walletId}`)
  if (!market.relations.supportedBorrowAssetIds.includes(action.assetId)) {
    throw new Error(`Asset ${action.assetId} is not supported by market ${action.marketId}`)
  }
  if (action.amountUsd6 <= 0n) throw new Error("Borrow amount must be positive")
  if (asset.snapshot.availableLiquidityUsd6 < action.amountUsd6) {
    throw new Error(`Asset ${action.assetId} does not have enough liquidity`)
  }

  const currentMetrics = calculateCreditMetrics(state, action.walletId)
  if (currentMetrics.availableCreditUsd6 < action.amountUsd6) {
    throw new Error(`Wallet ${action.walletId} does not have enough available credit`)
  }

  const existing = account.debtPositions.find((position) => position.assetId === action.assetId && position.marketId === action.marketId)
  const debtIndexRay = existing?.debtIndexRay ?? state.accounts[action.walletId]!.debtPositions[0]?.debtIndexRay ?? state.markets[action.marketId]!.snapshot.supplyIndexRay
  const debtSharesUsd6 = assetsToShares(action.amountUsd6, debtIndexRay)

  if (existing) {
    existing.debtSharesUsd6 += debtSharesUsd6
    existing.principalBorrowedUsd6 += action.amountUsd6
  } else {
    account.debtPositions.push({
      id: `${action.walletId}:${action.marketId}:${action.assetId}`,
      assetId: action.assetId,
      marketId: action.marketId,
      debtSharesUsd6,
      debtIndexRay,
      borrowRateWad: asset.borrowConfig.baseBorrowAprWad,
      principalBorrowedUsd6: action.amountUsd6,
    })
  }

  asset.snapshot.availableLiquidityUsd6 -= action.amountUsd6
  asset.snapshot.totalBorrowedUsd6 += action.amountUsd6
  asset.snapshot.totalDebtSharesUsd6 += debtSharesUsd6
  state.transactions.push({
    id: `tx-${state.transactions.length + 1}`,
    walletId: action.walletId,
    marketId: action.marketId,
    assetId: action.assetId,
    kind: "borrow",
    amountUsd6: action.amountUsd6,
    at: action.at ?? state.now,
  })

  syncBorrowRates(state, action.walletId)
  return state
}

function applySupplyCollateralAction(state: BorrowSystemState, action: Extract<BorrowAction, { type: "supplyCollateral" }>) {
  const market = state.markets[action.marketId]
  const account = state.accounts[action.walletId]

  if (!market) throw new Error(`Unknown market ${action.marketId}`)
  if (!account) throw new Error(`Unknown wallet ${action.walletId}`)
  if (action.amountUsd6 <= 0n) throw new Error("Supply amount must be positive")

  const tokenAmount = usd6ToTokenAmount(action.amountUsd6, market.snapshot.lpTokenPriceUsd6)
  const collateralShares = assetsToShares(tokenAmount, market.snapshot.supplyIndexRay)
  const existing = account.collateralPositions.find((position) => position.marketId === action.marketId)

  if (existing) {
    existing.collateralShares += collateralShares
    existing.principalTokenAmount += tokenAmount
  } else {
    account.collateralPositions.push({
      id: `${action.walletId}:${action.marketId}:collateral`,
      marketId: action.marketId,
      collateralShares,
      principalTokenAmount: tokenAmount,
      collateralEnabled: true,
    })
  }

  market.snapshot.totalCollateralShares += collateralShares
  market.snapshot.totalLiquidityUsd6 += action.amountUsd6
  market.snapshot.availableUsd6 += action.amountUsd6
  state.transactions.push({
    id: `tx-${state.transactions.length + 1}`,
    walletId: action.walletId,
    marketId: action.marketId,
    kind: "deposit",
    amountUsd6: action.amountUsd6,
    at: action.at ?? state.now,
  })

  syncBorrowRates(state, action.walletId)
  return state
}

function applyRepayAction(state: BorrowSystemState, action: Extract<BorrowAction, { type: "repay" }>) {
  const account = state.accounts[action.walletId]
  if (!account) throw new Error(`Unknown wallet ${action.walletId}`)
  if (action.amountUsd6 <= 0n) throw new Error("Repay amount must be positive")

  const debtIndex = account.debtPositions.findIndex((position) => position.id === action.debtPositionId)
  if (debtIndex === -1) throw new Error(`Unknown debt position ${action.debtPositionId}`)

  const position = account.debtPositions[debtIndex]!
  const asset = state.assets[position.assetId]
  if (!asset) throw new Error(`Unknown asset ${position.assetId}`)

  const currentDebtUsd6 = currentDebtValueUsd6(position)
  const repayAmountUsd6 = action.amountUsd6 > currentDebtUsd6 ? currentDebtUsd6 : action.amountUsd6
  const interestOwedUsd6 = debtInterestOwedUsd6(position)
  const sharesToBurn = repayAmountUsd6 === currentDebtUsd6 ? position.debtSharesUsd6 : assetsToShares(repayAmountUsd6, position.debtIndexRay)
  const principalReductionUsd6 = repayAmountUsd6 > interestOwedUsd6 ? repayAmountUsd6 - interestOwedUsd6 : 0n

  position.debtSharesUsd6 = position.debtSharesUsd6 > sharesToBurn ? position.debtSharesUsd6 - sharesToBurn : 0n
  position.principalBorrowedUsd6 =
    position.principalBorrowedUsd6 > principalReductionUsd6 ? position.principalBorrowedUsd6 - principalReductionUsd6 : 0n

  asset.snapshot.availableLiquidityUsd6 += repayAmountUsd6
  asset.snapshot.totalBorrowedUsd6 = asset.snapshot.totalBorrowedUsd6 > repayAmountUsd6 ? asset.snapshot.totalBorrowedUsd6 - repayAmountUsd6 : 0n
  asset.snapshot.totalDebtSharesUsd6 = asset.snapshot.totalDebtSharesUsd6 > sharesToBurn ? asset.snapshot.totalDebtSharesUsd6 - sharesToBurn : 0n

  if (position.debtSharesUsd6 === 0n || position.principalBorrowedUsd6 === 0n) {
    account.debtPositions.splice(debtIndex, 1)
  }

  state.transactions.push({
    id: `tx-${state.transactions.length + 1}`,
    walletId: action.walletId,
    marketId: position.marketId,
    assetId: position.assetId,
    kind: "repay",
    amountUsd6: repayAmountUsd6,
    at: action.at ?? state.now,
  })

  syncBorrowRates(state, action.walletId)
  return state
}

function applyRemoveCollateralAction(state: BorrowSystemState, action: Extract<BorrowAction, { type: "removeCollateral" }>) {
  const account = state.accounts[action.walletId]
  if (!account) throw new Error(`Unknown wallet ${action.walletId}`)

  const positionIndex = account.collateralPositions.findIndex((position) => position.id === action.positionId)
  if (positionIndex === -1) throw new Error(`Unknown collateral position ${action.positionId}`)

  const position = account.collateralPositions[positionIndex]!
  const market = state.markets[position.marketId]
  if (!market) throw new Error(`Unknown market ${position.marketId}`)

  const currentValueUsd6 = currentCollateralValueUsd6(position, market)
  const percentBps = action.percentBps ?? 0
  if (percentBps < 0 || percentBps > 10_000) throw new Error("Remove percent must be between 0 and 10000 basis points")

  const requestedUsd6 = action.amountUsd6 ?? (percentBps > 0 ? mulDiv(currentValueUsd6, BigInt(percentBps), 10_000n) : 0n)
  const removeUsd6 = requestedUsd6 > currentValueUsd6 ? currentValueUsd6 : requestedUsd6
  if (removeUsd6 <= 0n) throw new Error("Remove amount must be positive")

  const tokenAmount = usd6ToTokenAmount(removeUsd6, market.snapshot.lpTokenPriceUsd6)
  const collateralShares = removeUsd6 >= currentValueUsd6 ? position.collateralShares : assetsToShares(tokenAmount, market.snapshot.supplyIndexRay)
  const principalReduction =
    position.collateralShares > 0n ? mulDiv(position.principalTokenAmount, collateralShares, position.collateralShares) : 0n

  position.collateralShares = position.collateralShares > collateralShares ? position.collateralShares - collateralShares : 0n
  position.principalTokenAmount =
    position.principalTokenAmount > principalReduction ? position.principalTokenAmount - principalReduction : 0n

  market.snapshot.totalCollateralShares =
    market.snapshot.totalCollateralShares > collateralShares ? market.snapshot.totalCollateralShares - collateralShares : 0n
  market.snapshot.totalLiquidityUsd6 = market.snapshot.totalLiquidityUsd6 > removeUsd6 ? market.snapshot.totalLiquidityUsd6 - removeUsd6 : 0n
  market.snapshot.availableUsd6 = market.snapshot.availableUsd6 > removeUsd6 ? market.snapshot.availableUsd6 - removeUsd6 : 0n

  if (position.collateralShares === 0n) {
    account.collateralPositions.splice(positionIndex, 1)
  }

  const metrics = calculateCreditMetrics(state, action.walletId)
  if (metrics.totalBorrowedUsd6 > 0n && metrics.healthFactorWad < WAD) {
    throw new Error(`Removing collateral would make wallet ${action.walletId} insolvent`)
  }

  state.transactions.push({
    id: `tx-${state.transactions.length + 1}`,
    walletId: action.walletId,
    marketId: position.marketId,
    kind: "withdraw",
    amountUsd6: removeUsd6,
    at: action.at ?? state.now,
  })

  syncBorrowRates(state, action.walletId)
  return state
}

function applyLiquidationAction(state: BorrowSystemState, action: Extract<BorrowAction, { type: "liquidate" }>) {
  const account = state.accounts[action.walletId]
  if (!account) throw new Error(`Unknown wallet ${action.walletId}`)
  if (action.repayAmountUsd6 <= 0n) throw new Error("Liquidation repay amount must be positive")

  const metricsBefore = calculateCreditMetrics(state, action.walletId)
  if (metricsBefore.totalBorrowedUsd6 === 0n) throw new Error(`Wallet ${action.walletId} has no debt to liquidate`)
  if (metricsBefore.healthFactorWad >= WAD) throw new Error(`Wallet ${action.walletId} is not eligible for liquidation`)

  const positionIndex = account.collateralPositions.findIndex((position) => position.id === action.positionId)
  if (positionIndex === -1) throw new Error(`Unknown collateral position ${action.positionId}`)

  const collateralPosition = account.collateralPositions[positionIndex]!
  const market = state.markets[collateralPosition.marketId]
  if (!market) throw new Error(`Unknown market ${collateralPosition.marketId}`)

  const debtIndex =
    action.debtPositionId != null
      ? account.debtPositions.findIndex((position) => position.id === action.debtPositionId)
      : account.debtPositions.findIndex((position) => position.marketId === collateralPosition.marketId)
  if (debtIndex === -1) throw new Error(`Unknown debt position ${action.debtPositionId ?? "(auto)"}`)

  const debtPosition = account.debtPositions[debtIndex]!
  const asset = state.assets[debtPosition.assetId]
  if (!asset) throw new Error(`Unknown asset ${debtPosition.assetId}`)

  const currentCollateralUsd6 = currentCollateralValueUsd6(collateralPosition, market)
  const currentDebtUsd6 = currentDebtValueUsd6(debtPosition)
  const actualRepayUsd6 = [action.repayAmountUsd6, currentDebtUsd6, currentCollateralUsd6].reduce((min, value) =>
    value < min ? value : min,
  )
  if (actualRepayUsd6 <= 0n) throw new Error("Liquidation has no repayable value")

  const seizedTokenAmount = usd6ToTokenAmount(actualRepayUsd6, market.snapshot.lpTokenPriceUsd6)
  const seizedCollateralShares =
    actualRepayUsd6 >= currentCollateralUsd6 ? collateralPosition.collateralShares : assetsToShares(seizedTokenAmount, market.snapshot.supplyIndexRay)
  const principalReduction =
    collateralPosition.collateralShares > 0n
      ? mulDiv(collateralPosition.principalTokenAmount, seizedCollateralShares, collateralPosition.collateralShares)
      : 0n
  const interestOwedUsd6 = debtInterestOwedUsd6(debtPosition)
  const sharesToBurn = actualRepayUsd6 === currentDebtUsd6 ? debtPosition.debtSharesUsd6 : assetsToShares(actualRepayUsd6, debtPosition.debtIndexRay)
  const principalReductionUsd6 = actualRepayUsd6 > interestOwedUsd6 ? actualRepayUsd6 - interestOwedUsd6 : 0n

  collateralPosition.collateralShares =
    collateralPosition.collateralShares > seizedCollateralShares ? collateralPosition.collateralShares - seizedCollateralShares : 0n
  collateralPosition.principalTokenAmount =
    collateralPosition.principalTokenAmount > principalReduction ? collateralPosition.principalTokenAmount - principalReduction : 0n

  market.snapshot.totalCollateralShares =
    market.snapshot.totalCollateralShares > seizedCollateralShares ? market.snapshot.totalCollateralShares - seizedCollateralShares : 0n
  market.snapshot.totalLiquidityUsd6 =
    market.snapshot.totalLiquidityUsd6 > actualRepayUsd6 ? market.snapshot.totalLiquidityUsd6 - actualRepayUsd6 : 0n
  market.snapshot.availableUsd6 = market.snapshot.availableUsd6 > actualRepayUsd6 ? market.snapshot.availableUsd6 - actualRepayUsd6 : 0n

  debtPosition.debtSharesUsd6 = debtPosition.debtSharesUsd6 > sharesToBurn ? debtPosition.debtSharesUsd6 - sharesToBurn : 0n
  debtPosition.principalBorrowedUsd6 =
    debtPosition.principalBorrowedUsd6 > principalReductionUsd6 ? debtPosition.principalBorrowedUsd6 - principalReductionUsd6 : 0n

  asset.snapshot.availableLiquidityUsd6 += actualRepayUsd6
  asset.snapshot.totalBorrowedUsd6 = asset.snapshot.totalBorrowedUsd6 > actualRepayUsd6 ? asset.snapshot.totalBorrowedUsd6 - actualRepayUsd6 : 0n
  asset.snapshot.totalDebtSharesUsd6 = asset.snapshot.totalDebtSharesUsd6 > sharesToBurn ? asset.snapshot.totalDebtSharesUsd6 - sharesToBurn : 0n

  if (collateralPosition.collateralShares === 0n) {
    account.collateralPositions.splice(positionIndex, 1)
  }
  if (debtPosition.debtSharesUsd6 === 0n || debtPosition.principalBorrowedUsd6 === 0n) {
    account.debtPositions.splice(debtIndex, 1)
  }

  state.transactions.push({
    id: `tx-${state.transactions.length + 1}`,
    walletId: action.walletId,
    marketId: collateralPosition.marketId,
    assetId: debtPosition.assetId,
    kind: "liquidate",
    amountUsd6: actualRepayUsd6,
    at: action.at ?? state.now,
  })

  syncBorrowRates(state, action.walletId)
  return state
}

export function applyBorrowAction(state: BorrowSystemState, action: BorrowAction): BorrowSystemState {
  const accrued = accrueBorrowSystemState(state, action.at ?? state.now)
  const next = cloneState(accrued)

  switch (action.type) {
    case "borrow":
      return applyBorrowDebtAction(next, action)
    case "supplyCollateral":
      return applySupplyCollateralAction(next, action)
    case "repay":
      return applyRepayAction(next, action)
    case "removeCollateral":
      return applyRemoveCollateralAction(next, action)
    case "liquidate":
      return applyLiquidationAction(next, action)
    default:
      throw new Error(`Unsupported action ${action.type}`)
  }
}
