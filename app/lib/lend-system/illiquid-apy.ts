export const MIN_RELIABLE_LEND_TVL_USD = 10_000

export function isIlliquidLendMarket(tvlUsd: number) {
  return tvlUsd < MIN_RELIABLE_LEND_TVL_USD
}

export function formatReliableLendApyLabel(apy: number, tvlUsd: number, formatter: (value: number) => string) {
  if (isIlliquidLendMarket(tvlUsd)) {
    return "Illiquid · APY unreliable"
  }
  return formatter(apy)
}
