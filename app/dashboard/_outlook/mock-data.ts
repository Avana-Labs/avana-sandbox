/**
 * Mock payloads for the Outlook sections. UI-only phase — these stand in for the
 * Convex hydrators and mirror their eventual shape. Values are static (no
 * Math.random / Date.now at render) so SSR and the first client render agree.
 *
 * Later wiring map (see plan): MultiplyOutlookData ← multiply position +
 * multiplyMarkets params. None of that is imported here.
 */

// ── Multiply ─────────────────────────────────────────────────────────────────

export interface MultiplyPositionOutlook {
  collateralSymbol: string
  borrowSymbol: string
  equityUsd: number
  currentLtv: number // 0–1
  maxLtv: number // 0–1
  liqThreshold: number // 0–1
  collateralPriceUsd: number
  yieldApyPct: number // collateral supply + staking
  borrowAprPct: number // debt cost
}

export interface MultiplyOutlookData {
  position: MultiplyPositionOutlook
}

export const MOCK_MULTIPLY_OUTLOOK: MultiplyOutlookData = {
  position: {
    collateralSymbol: "wstETH",
    borrowSymbol: "ETH",
    equityUsd: 10000,
    currentLtv: 0.7,
    maxLtv: 0.9,
    liqThreshold: 0.93,
    collateralPriceUsd: 3180,
    yieldApyPct: 5.0,
    borrowAprPct: 3.4,
  },
}
