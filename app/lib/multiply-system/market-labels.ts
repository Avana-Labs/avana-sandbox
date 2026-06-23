/** Short pair label (e.g. "USDC / GHO"). */
export function formatMultiplyLoopPairLabel(collateralSymbol: string, borrowSymbol: string) {
  return `${collateralSymbol} / ${borrowSymbol}`
}

/** Market row label that names collateral and borrow roles explicitly. */
export function formatMultiplyLoopMarketLabel(collateralSymbol: string, borrowSymbol: string) {
  return `${collateralSymbol} collateral · borrow ${borrowSymbol}`
}
