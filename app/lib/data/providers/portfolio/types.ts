import type { HomeCollateralPool } from "@/app/lib/home-sim"
import type { ChartRangeData } from "@/app/components/charts"
import type { NetworkId } from "@/app/portfolio/hero/types"

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
  headlineValue: string
  headlineDelta: string
  headlineMeta?: string
  rangeData: ChartRangeData
  actionLabels: string[]
  hideChart?: boolean
  hideActions?: boolean
  hideStats?: boolean
  primaryActionLabel: string
  secondaryActionLabel: string
  statOneLabel?: string
  statOneValue?: string
  statOneHelpText?: string
  statTwoLabel?: string
  statTwoValue?: string
  statTwoHelpText?: string
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
  multiply: {
    totalExposureUsd: number
    openPositions: number
    netCarryPct: number
  }
  activity: {
    totalEvents: number
    settledToday: number
    pendingToday: number
  }
}

export type PortfolioBorrowTabData = {
  creditLines: {
    approvedUsd: number
    averageHealthFactor: number | null
    currentLtvPct: number
    totalBorrowedUsd: number
    totalCollateralUsd: number
  }
  collateralPositions: Array<{
    pool: HomeCollateralPool
    borrowedUsd: number
    healthFactor: number | null
    pairApr: number
    feesUsd: number
    feesLabel: string
  }>
  debtPositions: Array<{
    id: string
    pool: HomeCollateralPool
    borrowedUsd: number
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

export type PortfolioStrategyPool = {
  name: string
  apy: string
  tvl: string
  isUp: boolean
  allocationUsd: number
}

export type PortfolioStrategyBucket = {
  title: string
  description: string
  badgeClassName: string
  badgeLabel: string
  accentClassName: string
  pools: PortfolioStrategyPool[]
}

export type PortfolioLendTabData = {
  investments: PortfolioSupplyPosition[]
  strategyBuckets: PortfolioStrategyBucket[]
}

export type PortfolioMultiplyCollateral = {
  id: string
  label: string
  tokens: [string, string]
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
  product: "borrow" | "pool" | "lend" | "multiply"
  kind:
    | "supply"
    | "withdraw"
    | "borrow"
    | "repay"
    | "pledge"
    | "claim"
    | "open"
    | "addCollateral"
    | "reduce"
    | "close"
    | "rebalance"
    | "interest"
    | "liquidation"
  status: "confirmed" | "pending" | "failed"
  amountLabel: string
  primaryLabel: string
  secondaryLabel: string
  txHash: string
  txHashShort: string
  txHref: string
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
