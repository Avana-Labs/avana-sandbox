import type { ChartRangeData } from "@/app/components/charts"
import type { NetworkId } from "@/app/portfolio/hero/types"
import type {
  PortfolioActivityKind,
  PortfolioActivityProduct,
  PortfolioActivityStatus,
  PortfolioStrategyTone,
} from "./source"

export type PortfolioTabKey = "overview" | "lending" | "looping" | "activity"

export type FetchPortfolioPageInput = {
  walletProfileId: string
}

export type PortfolioWalletProfile = {
  id: string
  walletAddress: string
  displayName: string
  selectedNetwork: NetworkId
  networks: NetworkId[]
}

export type PortfolioHeroData = {
  headlineValue?: string
  headlineDelta?: string
  rangeData?: ChartRangeData
  statOneValue?: string
  statTwoValue?: string
}

export type PortfolioTabSummary = {
  borrow: {
    totalCollateralUsd: number
    totalDebtUsd: number
    availableToBorrowUsd: number
    averageHealthFactor: number | null
  }
  lend: {
    totalSuppliedUsd: number
    totalEarnedUsd: number
    averageApyPct: number
  }
  multiply: Record<string, never>
  activity: {
    totalEvents: number
  }
}

export type PortfolioBorrowTabData = {
  creditLines: {
    approvedUsd: number
    liquidationThresholdUsd: number
    averageHealthFactor: number | null
    currentLtvPct: number
    totalBorrowedUsd: number
    totalCollateralUsd: number
  }
  collateralPositions: Array<{
    pool: PortfolioPool
    borrowedUsd: number
    remainingBorrowPowerUsd: number
    liquidationThresholdUsd: number
    healthFactor: number | null
    pairApr: number
    feesUsd: number
  }>
  debtPositions: Array<{
    id: string
    pool: PortfolioPool
    borrowedUsd: number
    liquidationThresholdUsd: number
    healthFactor: number | null
    borrowApr: number
    accruedInterestUsd: number
    dailyInterestUsd: number
  }>
}

export type PortfolioSupplyPosition = {
  id: string
  symbol: string
  name: string
  balance: number
  priceUsd: number
  suppliedUsd: number
  earnedUsd: number
  dailyEarnedUsd: number
  apyPct: number
}

export type PortfolioPoolVisual = {
  symbol: string
  shortLabel: string
  bgClassName: string
  textClassName: string
}

export type PortfolioPool = {
  id: string
  name: string
  venue: string
  category: string
  collateralUsd: number
  maxLtv: number
  borrowPowerUsd: number
  liquidationUsd: number
  pairApr: number
  visuals: [PortfolioPoolVisual, PortfolioPoolVisual]
}

export type PortfolioStrategyPool = {
  name: string
  apyPct: number
  tvlUsd: number
  isUp: boolean
  allocationUsd: number
}

export type PortfolioStrategyBucket = {
  title: string
  description: string
  apyRangeLabel: string
  tone: PortfolioStrategyTone
  pools: PortfolioStrategyPool[]
}

export type PortfolioLendTabData = {
  investments: PortfolioSupplyPosition[]
  strategyBuckets: PortfolioStrategyBucket[]
}

export type PortfolioMultiplyCollateral = {
  id: string
  label: string
  collateralToken: string
  borrowableToken: string
  multiplier: number
  protocol: string
  healthFactor: number
  collateralUsd: number
  borrowPowerUsd: number
}

export type PortfolioMultiplyPosition = {
  id: string
  symbol: string
  label: string
  side: "long" | "short"
  leverage: number
  collateralUsd: number
  exposureUsd: number
  pnlUsd: number
  pnlPct: number
  status: "open" | "closed"
}

export type PortfolioOrder = {
  id: string
  label: string
  status: "open" | "pending" | "filled"
  sizeUsd: number
  venue: string
}

export type PortfolioTwapOrder = {
  id: string
  label: string
  interval: string
  status: "active" | "paused" | "completed"
  amountUsd: number
}

export type PortfolioActivityRow = {
  id: string
  at: string
  product: PortfolioActivityProduct
  kind: PortfolioActivityKind
  status: PortfolioActivityStatus
  amountUsd: number
  primaryLabel: string
  secondaryLabel: string
  txHash: string
}

export type PortfolioActivityData = {
  rows: PortfolioActivityRow[]
}

export type PortfolioRewardsData = {
  claimableUsd: number
  earnedUsd: number
  settledUsd: number
  pendingUsd: number
}

export type PortfolioMultiplyTabData = {
  creditLines: {
    approvedUsd: number
    liquidationThresholdUsd: number
    averageHealthFactor: number | null
    currentLtvPct: number
    totalBorrowedUsd: number
    totalCollateralUsd: number
  }
  lpCollaterals: PortfolioMultiplyCollateral[]
  positions: PortfolioMultiplyPosition[]
  openOrders: PortfolioOrder[]
  twapOrders: PortfolioTwapOrder[]
  history: PortfolioActivityRow[]
}

export type PortfolioPageData = {
  walletProfile: PortfolioWalletProfile
  fetchedAt: string
  heroByTab: Record<PortfolioTabKey, PortfolioHeroData>
  tabs: PortfolioTabSummary
  borrow: PortfolioBorrowTabData
  lend: PortfolioLendTabData
  multiply: PortfolioMultiplyTabData
  activity: PortfolioActivityData
  rewards: PortfolioRewardsData
}
