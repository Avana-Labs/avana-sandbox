export const MIN_RELIABLE_LEND_TVL_USD = 10_000

export function isIlliquidLendMarket(tvlUsd: number) {
  return tvlUsd < MIN_RELIABLE_LEND_TVL_USD
}

// Always show the real APY. Low-TVL markets used to read "Illiquid · APY unreliable",
// which disagreed with the detail page (it shows the number) and buried the rate — the
// low TVL is already visible in the row, so let users judge liquidity themselves.
export function formatReliableLendApyLabel(apy: number, _tvlUsd: number, formatter: (value: number) => string) {
  return formatter(apy)
}
