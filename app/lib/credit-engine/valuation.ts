import { TOKEN_SCALE, mulDiv, sharesToAssets } from "./units"
import type { BorrowAccountState, BorrowAssetRecord, BorrowMarketRecord, BorrowSystemState, UserCollateralPosition, UserDebtPosition } from "./types"

export function tokenAmountToUsd6(tokenAmount: bigint, priceUsd6: bigint) {
  return mulDiv(tokenAmount, priceUsd6, TOKEN_SCALE)
}

export function currentCollateralTokenAmount(position: UserCollateralPosition, market: BorrowMarketRecord) {
  return sharesToAssets(position.collateralShares, market.snapshot.supplyIndexRay)
}

export function currentCollateralValueUsd6(position: UserCollateralPosition, market: BorrowMarketRecord) {
  return tokenAmountToUsd6(currentCollateralTokenAmount(position, market), market.snapshot.lpTokenPriceUsd6)
}

export function collateralInterestEarnedUsd6(position: UserCollateralPosition, market: BorrowMarketRecord) {
  const currentAmount = currentCollateralTokenAmount(position, market)
  const earnedAmount = currentAmount > position.principalTokenAmount ? currentAmount - position.principalTokenAmount : 0n
  return tokenAmountToUsd6(earnedAmount, market.snapshot.lpTokenPriceUsd6)
}

export function currentDebtValueUsd6(position: UserDebtPosition) {
  return sharesToAssets(position.debtSharesUsd6, position.debtIndexRay)
}

export function debtInterestOwedUsd6(position: UserDebtPosition) {
  const currentDebt = currentDebtValueUsd6(position)
  return currentDebt > position.principalBorrowedUsd6 ? currentDebt - position.principalBorrowedUsd6 : 0n
}

export function totalCollateralValueUsd6(account: BorrowAccountState, markets: Record<string, BorrowMarketRecord>) {
  return account.collateralPositions.reduce((sum, position) => {
    const market = markets[position.marketId]
    if (!market || !position.collateralEnabled) return sum
    return sum + currentCollateralValueUsd6(position, market)
  }, 0n)
}

export function totalInterestEarnedUsd6(account: BorrowAccountState, markets: Record<string, BorrowMarketRecord>) {
  return account.collateralPositions.reduce((sum, position) => {
    const market = markets[position.marketId]
    if (!market || !position.collateralEnabled) return sum
    return sum + collateralInterestEarnedUsd6(position, market)
  }, 0n)
}

export function totalDebtValueUsd6(account: BorrowAccountState) {
  return account.debtPositions.reduce((sum, position) => sum + currentDebtValueUsd6(position), 0n)
}

export function totalInterestOwedUsd6(account: BorrowAccountState) {
  return account.debtPositions.reduce((sum, position) => sum + debtInterestOwedUsd6(position), 0n)
}

export function totalPrincipalBorrowedUsd6(account: BorrowAccountState) {
  return account.debtPositions.reduce((sum, position) => sum + position.principalBorrowedUsd6, 0n)
}

export function resolveAccount(state: BorrowSystemState, walletId: string) {
  return state.accounts[walletId]
}

export function resolveDebtAsset(state: BorrowSystemState, position: UserDebtPosition): BorrowAssetRecord {
  const asset = state.assets[position.assetId]
  if (!asset) throw new Error(`Unknown asset ${position.assetId}`)
  return asset
}
