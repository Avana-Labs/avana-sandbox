export type MultiplyRiskTier = "low" | "medium" | "high"

export type MultiplyMarketRecord = {
  id: string
  rank: number
  collateralAsset: {
    symbol: string
    name: string
    apy: number
    priceUsd: number
  }
  borrowAsset: {
    symbol: string
    name: string
    borrowApy: number
    priceUsd: number
  }
  risk: {
    maxLtv: number
    collateralFactor: number
    liquidationThreshold: number
    hardMaxMultiplier: number
    publicMaxMultiplier: number
    recommendedMaxMultiplier: number
    minHealthFactor: number
    riskTier: MultiplyRiskTier
  }
  economics: {
    estimatedMaxApy: number
    supplyApy: number
    borrowApy: number
    availableLiquidityUsd: number
  }
  ui: {
    status: "active" | "coming_soon" | "paused"
    featured?: boolean
    warning?: string
  }
}

export type MultiplyPosition = {
  id: string
  walletId: string
  marketId: string
  collateralAmount: number
  collateralValueUsd: number
  debtValueUsd: number
  multiplier: number
  ltv: number
  healthFactor: number | "infinity"
  liquidationPrice: number | null
  netApy: number
  openedAt: number
  lastUpdatedAt: number
}

export type MultiplyTransactionKind = "multiply" | "deleverage"

export type MultiplyTransaction = {
  id: string
  walletId: string
  marketId: string
  kind: MultiplyTransactionKind
  collateralAmountUsd: number
  debtDeltaUsd: number
  multiplierBefore: number
  multiplierAfter: number
  at: number
}

export type MultiplySystemState = {
  now: number
  markets: Record<string, MultiplyMarketRecord>
  positions: Record<string, MultiplyPosition>
  transactions: MultiplyTransaction[]
}

export type MultiplyAction =
  | {
      type: "multiply"
      walletId: string
      marketId: string
      collateralAmount: number
      selectedMultiplier: number
      at?: number
    }
  | {
      type: "deleverage"
      walletId: string
      positionId: string
      targetMultiplier: number
      repayAmountUsd?: number
      at?: number
    }

export type MultiplySimulation = {
  action: "multiply"
  input: {
    collateralAmount: number
    selectedMultiplier: number
  }
  before: {
    collateralValueUsd: number
    debtValueUsd: number
    ltv: number
    healthFactor: number | "infinity"
    multiplier: number
    liquidationPrice: number | null
  }
  after: {
    collateralValueUsd: number
    collateralAmount: number
    debtValueUsd: number
    ltv: number
    healthFactor: number | "infinity"
    multiplier: number
    liquidationPrice: number | null
    priceDropToLiquidationPct: number | null
  }
  economics: {
    supplyApy: number
    borrowApy: number
    netApy: number
    maxLeverageApy: number
    priceImpactPct: number
  }
  limits: {
    maxLtv: number
    liquidationThreshold: number
    theoreticalMaxMultiplier: number
    safeMaxMultiplier: number
    publicMaxMultiplier: number
    recommendedMaxMultiplier: number
    minHealthFactor: number
  }
  validation: {
    allowed: boolean
    errors: string[]
    warnings: string[]
  }
}

export type DeleverageSimulation = {
  action: "deleverage"
  input: {
    currentMultiplier: number
    targetMultiplier: number
  }
  before: {
    collateralValueUsd: number
    debtValueUsd: number
    ltv: number
    healthFactor: number | "infinity"
    multiplier: number
    liquidationPrice: number | null
  }
  after: {
    collateralValueUsd: number
    debtValueUsd: number
    debtRepaidUsd: number
    collateralUnwoundUsd: number
    ltv: number
    healthFactor: number | "infinity"
    multiplier: number
    liquidationPrice: number | null
  }
  economics: {
    priceImpactPct: number
    effectiveRepayUsd: number
    netApy: number
  }
  validation: {
    allowed: boolean
    errors: string[]
    warnings: string[]
  }
}
