/**
 * Mock payloads for the Outlook sections. UI-only phase — these stand in for the
 * Convex hydrators and mirror their eventual shape. Values are static (no
 * Math.random / Date.now at render) so SSR and the first client render agree.
 *
 * Later wiring map (see plan): BorrowOutlookData ← riskSnapshots/getRiskSeries
 * (HF history) + pool liq thresholds + cross-product roll-up; MultiplyOutlookData
 * ← multiply position + multiplyMarkets params. None of that is imported here.
 */

// ── Borrow ───────────────────────────────────────────────────────────────────

export interface HealthFactorPoint {
  daysAgo: number
  healthFactor: number
}

export interface BorrowCollateralOutlook {
  symbol: string
  quantity: number
  currentPriceUsd: number
  liqThreshold: number // 0–1
  supplyApyPct: number
  collateralValueUsd: number
}

export interface BorrowOutlookData {
  healthFactor: number
  netApyPct: number
  borrowApyPct: number
  totalDebtUsd: number
  hfHistory: HealthFactorPoint[]
  collateral: BorrowCollateralOutlook[]
}

function mockHfHistory(current: number, points = 45): HealthFactorPoint[] {
  return Array.from({ length: points }, (_, i) => {
    const phase = (i / points) * Math.PI * 2
    const drift = Math.sin(phase * 1.2) * 0.35 + Math.cos(phase * 0.4) * 0.2 + (points - i) / points / 3
    return { daysAgo: points - 1 - i, healthFactor: Number(Math.max(1.05, current + drift).toFixed(2)) }
  })
}

export const MOCK_BORROW_OUTLOOK: BorrowOutlookData = {
  healthFactor: 1.7,
  netApyPct: 1.4,
  borrowApyPct: 6.1,
  totalDebtUsd: 19238,
  hfHistory: mockHfHistory(1.7),
  collateral: [
    {
      symbol: "WETH",
      quantity: 8.0,
      currentPriceUsd: 2698,
      liqThreshold: 0.83,
      supplyApyPct: 2.15,
      collateralValueUsd: 21584,
    },
    {
      symbol: "cbBTC",
      quantity: 0.3,
      currentPriceUsd: 63200,
      liqThreshold: 0.78,
      supplyApyPct: 0.4,
      collateralValueUsd: 18960,
    },
  ],
}

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
