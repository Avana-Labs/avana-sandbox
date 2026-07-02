// The multiply system has no per-wallet balance, so the meaningful cap on a
// collateral position is the market's available liquidity: you cannot loop against
// more collateral value than the pool can supply. This also rejects absurd inputs
// (e.g. 999,999,999 ETH) before they reach the simulation engine.

import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"
import {
  formatActionAmount,
  formatActionApproxUsd,
  formatActionFeeSummary,
} from "@/app/lib/action-system/formatters"

/** Maximum collateral amount (in collateral units) a market can absorb, or null if unknown. */
export function maxMultiplyCollateralAmount(availableLiquidityUsd: number, collateralPriceUsd: number): number | null {
  if (!Number.isFinite(availableLiquidityUsd) || availableLiquidityUsd <= 0) return null
  if (!Number.isFinite(collateralPriceUsd) || collateralPriceUsd <= 0) return null
  return availableLiquidityUsd / collateralPriceUsd
}

/** True when the collateral amount exceeds what the market's liquidity can support. */
export function exceedsMultiplyCollateralCap(collateralAmount: number, maxCollateralAmount: number | null): boolean {
  if (maxCollateralAmount == null) return false
  if (!Number.isFinite(collateralAmount)) return true
  return collateralAmount > maxCollateralAmount
}

/** Human-readable reason for an over-cap collateral amount. */
export function multiplyOverCapReason(collateralSymbol: string, maxCollateralAmount: number): string {
  return `Amount exceeds available market liquidity. Max ${formatActionAmount(maxCollateralAmount, collateralSymbol, 6)}.`
}

/**
 * A blocked preview shown when the entered collateral exceeds the market cap, so the
 * flow rejects the amount with a clear message instead of running a doomed simulation.
 */
export function buildMultiplyOverCapPreviewUi(options: {
  collateralSymbol: string
  borrowSymbol: string
  collateralAmount: number
  collateralPriceUsd: number
  marketLabel: string
  multiplier: number
  maxCollateralAmount: number
}): ActionPreviewUi {
  const reason = multiplyOverCapReason(options.collateralSymbol, options.maxCollateralAmount)
  return {
    allowed: false,
    amountTitle: "Collateral supplied",
    amountLabel: formatActionAmount(options.collateralAmount, options.collateralSymbol, 6),
    amountValue: String(options.collateralAmount),
    assetLabel: options.collateralSymbol,
    assetSymbol: options.collateralSymbol,
    amountUsdLabel: formatActionApproxUsd(options.collateralAmount * options.collateralPriceUsd),
    rateLabel: "",
    rateValue: "",
    marketLabel: "Market",
    marketValue: options.marketLabel,
    balanceLabel: "Available liquidity",
    balanceValue: formatActionAmount(options.maxCollateralAmount, options.collateralSymbol, 6),
    maxAmount: options.maxCollateralAmount,
    metrics: [],
    networkFeeLabel: formatActionFeeSummary(0, 0.04),
    risk: null,
    blockedReason: reason,
    validationErrors: [reason],
    warnings: [],
  }
}
