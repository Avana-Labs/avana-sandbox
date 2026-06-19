export type BorrowSpokeId =
  | "uni-v2"
  | "uni-v3-stable"
  | "uni-v3-bluechip"
  | "curve-crypto"
  | "bal-weighted"
  | "bal-boosted"
  | "bal-reclamm"
  | "aero-slipstream-bluechip"

export type BorrowVisual = {
  symbol: string
  shortLabel: string
  iconUrl?: string | null
  bgClassName: string
  textClassName: string
}

export type BorrowMetricPoint = {
  at: string
  value: bigint
}

export type BorrowMetricSeries = {
  label: string
  unit: "usd" | "pct" | "count"
  points: BorrowMetricPoint[]
}

export type BorrowFaqItem = {
  question: string
  answer: string
}

export type BorrowParameterChange = {
  date: string
  title: string
  body?: string
}

export type BorrowTransactionKind = "deposit" | "withdraw" | "borrow" | "repay" | "claim" | "liquidate"

export type BorrowTransaction = {
  id: string
  walletId: string
  marketId?: string
  assetId?: string
  kind: BorrowTransactionKind
  amountUsd6: bigint
  at: number
}

export type BorrowMarketRecord = {
  id: string
  spokeId: BorrowSpokeId
  display: {
    name: string
    lpSymbol: string
    venue: string
    chain: string
    feeTier: string
    subtitle: string
    visuals: [BorrowVisual, BorrowVisual]
  }
  riskConfig: {
    collateralFactorWad: bigint
    liquidationThresholdWad: bigint
    riskScoreWad: bigint
  }
  relations: {
    supportedBorrowAssetIds: string[]
    relatedMarketIds: string[]
  }
  snapshot: {
    lpTokenPriceUsd6: bigint
    feeApyWad: bigint
    totalLiquidityUsd6: bigint
    totalBorrowedUsd6: bigint
    availableUsd6: bigint
    volume24hUsd6: bigint
    fees24hUsd6: bigint
    totalCollateralShares: bigint
    supplyIndexRay: bigint
  }
  detail: {
    about: string
    faqs: BorrowFaqItem[]
    parameterChanges: BorrowParameterChange[]
    governanceNotes: Array<{ title: string; body: string; tone?: "info" | "warning" | "positive" }>
  }
  analytics: {
    keyMetrics: Record<string, BorrowMetricSeries>
    cashflow: BorrowMetricSeries
    engagement: BorrowMetricSeries
  }
}

export type BorrowAssetRecord = {
  id: string
  symbol: string
  display: {
    name: string
    subtitle: string
    chain: string
    category: "stable" | "eth" | "btc" | "crypto"
    visual: BorrowVisual
  }
  borrowConfig: {
    baseBorrowAprWad: bigint
  }
  snapshot: {
    priceUsd6: bigint
    priceChange24hWad: bigint
    availableLiquidityUsd6: bigint
    totalBorrowedUsd6: bigint
    totalDebtSharesUsd6: bigint
  }
  detail: {
    about: string
    faqs: BorrowFaqItem[]
  }
  analytics: {
    utilization: BorrowMetricSeries
    supplyBorrow: Record<string, BorrowMetricSeries>
  }
}

export type UserCollateralPosition = {
  id: string
  marketId: string
  collateralShares: bigint
  principalTokenAmount: bigint
  collateralEnabled: boolean
}

export type UserDebtPosition = {
  id: string
  assetId: string
  marketId?: string
  debtSharesUsd6: bigint
  debtIndexRay: bigint
  borrowRateWad: bigint
  principalBorrowedUsd6: bigint
}

export type BorrowAccountState = {
  walletId: string
  walletBalanceUsd6: bigint
  interestSettledUsd6: bigint
  lastUpdatedAt: number
  collateralPositions: UserCollateralPosition[]
  debtPositions: UserDebtPosition[]
}

export type BorrowAction =
  | {
      type: "borrow"
      walletId: string
      marketId: string
      assetId: string
      amountUsd6: bigint
      at?: number
    }
  | {
      type: "repay"
      walletId: string
      debtPositionId: string
      amountUsd6: bigint
      at?: number
    }
  | {
      type: "supplyCollateral"
      walletId: string
      marketId: string
      amountUsd6: bigint
      at?: number
    }
  | {
      type: "removeCollateral"
      walletId: string
      positionId: string
      amountUsd6?: bigint
      percentBps?: number
      at?: number
    }
  | {
      type: "liquidate"
      walletId: string
      positionId: string
      debtPositionId?: string
      liquidatorWalletId?: string
      repayAmountUsd6: bigint
      at?: number
    }

export type BorrowSystemState = {
  now: number
  markets: Record<string, BorrowMarketRecord>
  assets: Record<string, BorrowAssetRecord>
  accounts: Record<string, BorrowAccountState>
  transactions: BorrowTransaction[]
}
