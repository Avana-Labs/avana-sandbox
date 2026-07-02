import {
  createDataSourceAdapter,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { api } from "@/convex/_generated/api"
import { getAuthenticatedConvexClient } from "@/app/lib/data/providers/live-convex-client"

export type PortfolioActivityProduct = "borrow" | "pool" | "lend" | "multiply"

export type PortfolioActivityKind =
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

export type PortfolioActivityStatus = "confirmed" | "pending" | "failed"

export type PortfolioStrategyTone = "conservative" | "moderate" | "aggressive"

export type PortfolioWalletProfileRecord = {
  id: string
  walletAddress: string
}

export type PortfolioPoolVisualRecord = {
  symbol: string
  shortLabel: string
  bgClassName: string
  textClassName: string
}

export type PortfolioPoolRecord = {
  id: string
  name: string
  venue: string
  category: string
  collateralUsd: number
  maxLtv: number
  borrowPowerUsd: number
  liquidationUsd: number
  pairApr: number
  visuals: [PortfolioPoolVisualRecord, PortfolioPoolVisualRecord]
}

export type PortfolioSnapshotRecord = {
  walletProfileId: string
  timestamp: string
  totalValueUsd: number
  totalSuppliedUsd: number
  totalBorrowedUsd: number
  availableToBorrowUsd: number
  totalMultiplyExposureUsd: number
  totalEarnedUsd: number
}

export type PortfolioSupplyRecord = {
  id: string
  walletProfileId: string
  symbol: string
  name: string
  balance: number
  priceUsd: number
  suppliedUsd: number
  earnedUsd: number
  dailyEarnedUsd: number
  apyPct: number
}

export type PortfolioDebtRecord = {
  id: string
  walletProfileId: string
  poolId: string
  debtAssetSymbol: string
  borrowedUsd: number
  borrowAprPct: number
  accruedInterestUsd: number
  dailyInterestUsd: number
}

export type PortfolioCollateralRecord = {
  id: string
  walletProfileId: string
  pool: PortfolioPoolRecord
  borrowedUsd: number
  healthFactor: number | null
  pairApr: number
  feesUsd: number
}

export type PortfolioCreditLinesRecord = {
  walletProfileId: string
  approvedUsd: number
  liquidationThresholdUsd: number
  averageHealthFactor: number | null
  currentLtvPct: number
  totalBorrowedUsd: number
  totalCollateralUsd: number
}

export type PortfolioMultiplyCollateralRecord = {
  id: string
  walletProfileId: string
  label: string
  collateralToken: string
  borrowableToken: string
  multiplier: number
  protocol: string
  healthFactor: number
  collateralUsd: number
  borrowPowerUsd: number
}

export type PortfolioMultiplyPositionRecord = {
  id: string
  walletProfileId: string
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

export type PortfolioOpenOrderRecord = {
  id: string
  walletProfileId: string
  label: string
  status: "open" | "pending" | "filled"
  sizeUsd: number
  venue: string
}

export type PortfolioTwapOrderRecord = {
  id: string
  walletProfileId: string
  label: string
  interval: string
  status: "active" | "paused" | "completed"
  amountUsd: number
}

export type PortfolioActivityRecord = {
  id: string
  walletProfileId: string
  at: string
  product: PortfolioActivityProduct
  kind: PortfolioActivityKind
  status: PortfolioActivityStatus
  amountUsd: number
  primaryLabel: string
  secondaryLabel: string
  txHash: string
}

export type PortfolioStrategyPoolRecord = {
  name: string
  apyPct: number
  tvlUsd: number
  isUp: boolean
  allocationUsd: number
}

export type PortfolioStrategyBucketRecord = {
  title: string
  description: string
  apyRangeLabel: string
  tone: PortfolioStrategyTone
  pools: PortfolioStrategyPoolRecord[]
}

export type PortfolioRewardsRecord = {
  walletProfileId: string
  claimableUsd: number
  earnedUsd: number
  settledUsd: number
  pendingUsd: number
}

export type PortfolioPageRecords = {
  walletProfile: PortfolioWalletProfileRecord
  snapshots: PortfolioSnapshotRecord[]
  supplies: PortfolioSupplyRecord[]
  debts: PortfolioDebtRecord[]
  collaterals: PortfolioCollateralRecord[]
  multiplyCreditLines: PortfolioCreditLinesRecord
  multiplyCollaterals: PortfolioMultiplyCollateralRecord[]
  multiplyPositions: PortfolioMultiplyPositionRecord[]
  openOrders: PortfolioOpenOrderRecord[]
  twapOrders: PortfolioTwapOrderRecord[]
  activity: PortfolioActivityRecord[]
  strategies: PortfolioStrategyBucketRecord[]
  rewards: PortfolioRewardsRecord
}

export type PortfolioPageSource = {
  adapter: DataSourceAdapter
  getDefaultWalletProfileId(context?: DataSourceRequestContext): string
  getPortfolioPageRecords(
    walletProfileId: string,
    context?: DataSourceRequestContext,
  ): Promise<DataSourceResponse<PortfolioPageRecords>>
}

export const livePortfolioPageAdapter = createDataSourceAdapter({
  id: "portfolio-live",
  label: "Portfolio page live source",
  mode: "live",
  supportsPagination: true,
})

export const livePortfolioPageSource: PortfolioPageSource = {
  adapter: livePortfolioPageAdapter,
  getDefaultWalletProfileId() {
    return getAuthenticatedConvexClient(livePortfolioPageAdapter.id, "getDefaultWalletProfileId").wallet
  },
  async getPortfolioPageRecords(walletProfileId) {
    const { client, wallet } = getAuthenticatedConvexClient(livePortfolioPageAdapter.id, "getPortfolioPageRecords")
    if (walletProfileId && walletProfileId.toLowerCase() !== wallet) {
      throw new Error("Requested portfolio does not match the authenticated wallet.")
    }
    const state = await client.query(api.sandbox.transactions.getPortfolioPageState, { wallet })
    const marketBySlug = new Map(state.markets.map((market) => [market.slug, market]))
    const poolBySlug = new Map(state.pools.map((pool) => [pool.slug, pool]))
    const toUsd = (value?: string) => Number(BigInt(value ?? "0")) / 1_000_000
    const multiplyPositions = state.positions.filter((position) => position.product === "multiply")
    const totalMultiplyCollateral = multiplyPositions.reduce((sum, position) => sum + (position.collateralValueUsd ?? 0), 0)
    const totalMultiplyDebt = multiplyPositions.reduce((sum, position) => sum + (position.debtValueUsd ?? 0), 0)
    const healthFactors = multiplyPositions
      .map((position) => position.healthFactor)
      .filter((value): value is number => typeof value === "number")
    const rewardState = state.rewards
      ? (JSON.parse(state.rewards.stateJson) as { claims?: Array<{ amount: number; status: string }> })
      : null
    const claimedRewards = rewardState?.claims?.filter((claim) => claim.status === "confirmed") ?? []

    const supplies: PortfolioSupplyRecord[] = state.positions
      .filter((position) => position.product === "lend")
      .map((position) => {
        const market = marketBySlug.get(position.marketSlug)
        const suppliedUsd = toUsd(position.suppliedUsd6)
        const earnedUsd = toUsd(position.earnedUsd6)
        const priceUsd = 1
        return {
          id: String(position._id),
          walletProfileId: wallet,
          symbol: market?.symbol ?? position.marketSlug.toUpperCase(),
          name: market?.name ?? position.marketSlug,
          balance: suppliedUsd / priceUsd,
          priceUsd,
          suppliedUsd,
          earnedUsd,
          dailyEarnedUsd: 0,
          apyPct: 0,
        }
      })

    const collaterals: PortfolioCollateralRecord[] = state.positions
      .filter((position) => position.product === "borrow")
      .flatMap((position) =>
        position.collateral.map((collateral) => {
          const pool = poolBySlug.get(collateral.marketSlug)
          const collateralUsd = toUsd(collateral.collateralValueUsd6)
          const borrowedUsd = position.debt.reduce(
            (sum, debt) => sum + Number((BigInt(debt.debtSharesUsd6) * BigInt(debt.debtIndexRay)) / 10n ** 27n) / 1_000_000,
            0,
          )
          const maxLtv = pool?.maxLtvPct ?? 0
          const liquidationUsd = collateralUsd * ((pool?.liquidationThresholdPct ?? maxLtv) / 100)
          const visuals = pool?.visuals?.slice(0, 2) ?? []
          const fallbackVisual = { symbol: "AVA", shortLabel: "A", bgClassName: "bg-brand", textClassName: "text-brand-foreground" }
          return {
            id: String(collateral._id),
            walletProfileId: wallet,
            pool: {
              id: collateral.marketSlug,
              name: pool?.name ?? collateral.marketSlug,
              venue: pool?.venue ?? "Avana",
              category: pool?.category ?? "sandbox",
              collateralUsd,
              maxLtv,
              // Borrow power is collateral × maxLTV and can never exceed the
              // collateral value; clamp defensively so a bad maxLtvPct (>100)
              // can't surface a Max-Borrow larger than the collateral.
              borrowPowerUsd: collateralUsd * (Math.min(maxLtv, 100) / 100),
              liquidationUsd,
              pairApr: pool?.pairAprPct ?? 0,
              visuals: [visuals[0] ?? fallbackVisual, visuals[1] ?? fallbackVisual],
            },
            borrowedUsd,
            // Health factor uses the liquidation threshold (LT > maxLTV), matching the
            // canonical credit engine (metrics.ts). maxLTV only sizes borrow power.
            healthFactor: borrowedUsd > 0 ? liquidationUsd / borrowedUsd : null,
            pairApr: pool?.pairAprPct ?? 0,
            feesUsd: 0,
          }
        }),
      )

    const debts: PortfolioDebtRecord[] = state.positions
      .filter((position) => position.product === "borrow")
      .flatMap((position) =>
        position.debt.map((debt) => ({
          id: String(debt._id),
          walletProfileId: wallet,
          poolId: debt.marketSlug ?? position.marketSlug,
          debtAssetSymbol: debt.baseAssetId.toUpperCase(),
          borrowedUsd: Number((BigInt(debt.debtSharesUsd6) * BigInt(debt.debtIndexRay)) / 10n ** 27n) / 1_000_000,
          borrowAprPct: Number(BigInt(debt.borrowRateWad)) / 10 ** 16,
          accruedInterestUsd: 0,
          dailyInterestUsd: 0,
        })),
      )

    const activity: PortfolioActivityRecord[] = state.transactions.map((transaction) => ({
      id: String(transaction._id),
      walletProfileId: wallet,
      at: new Date(transaction.at).toISOString(),
      product: transaction.product === "borrow" ? "borrow" : transaction.product === "lend" ? "lend" : "multiply",
      kind:
        transaction.kind === "deposit"
          ? "supply"
          : transaction.kind === "multiply"
            ? "open"
            : transaction.kind === "deleverage"
              ? "reduce"
              : (transaction.kind as PortfolioActivityKind),
      status: transaction.status === "success" ? "confirmed" : transaction.status,
      amountUsd: transaction.amountUsd,
      primaryLabel: transaction.marketSlug ?? transaction.product,
      secondaryLabel: transaction.kind,
      txHash: transaction.syntheticTxHash,
    }))

    return {
      fetchedAt: new Date().toISOString(),
      pageInfo: { nextCursor: null, hasMore: false },
      data: {
        walletProfile: { id: wallet, walletAddress: wallet },
        snapshots: state.snapshots.map((snapshot) => ({
          walletProfileId: wallet,
          timestamp: new Date(snapshot.at).toISOString(),
          totalValueUsd: snapshot.totalValueUsd,
          totalSuppliedUsd: snapshot.totalSuppliedUsd,
          totalBorrowedUsd: snapshot.totalBorrowedUsd,
          availableToBorrowUsd: snapshot.availableToBorrowUsd,
          totalMultiplyExposureUsd: snapshot.totalMultiplyExposureUsd,
          totalEarnedUsd: snapshot.totalEarnedUsd,
        })),
        supplies,
        debts,
        collaterals,
        multiplyCreditLines: {
          walletProfileId: wallet,
          approvedUsd: Math.max(0, totalMultiplyCollateral - totalMultiplyDebt),
          liquidationThresholdUsd: totalMultiplyCollateral * 0.8,
          averageHealthFactor: healthFactors.length
            ? healthFactors.reduce((sum, value) => sum + value, 0) / healthFactors.length
            : null,
          currentLtvPct: totalMultiplyCollateral > 0 ? (totalMultiplyDebt / totalMultiplyCollateral) * 100 : 0,
          totalBorrowedUsd: totalMultiplyDebt,
          totalCollateralUsd: totalMultiplyCollateral,
        },
        multiplyCollaterals: multiplyPositions.map((position) => {
          const market = marketBySlug.get(position.marketSlug)
          return {
            id: String(position._id),
            walletProfileId: wallet,
            label: market?.name ?? position.marketSlug,
            collateralToken: market?.symbol ?? position.marketSlug,
            borrowableToken: position.assetId ?? "USD",
            multiplier: position.multiplier ?? 1,
            protocol: market?.venueLabel ?? "Avana",
            healthFactor: typeof position.healthFactor === "number" ? position.healthFactor : Number.POSITIVE_INFINITY,
            collateralUsd: position.collateralValueUsd ?? 0,
            borrowPowerUsd: Math.max(0, (position.collateralValueUsd ?? 0) - (position.debtValueUsd ?? 0)),
          }
        }),
        multiplyPositions: multiplyPositions.map((position) => ({
          id: String(position._id),
          walletProfileId: wallet,
          symbol: marketBySlug.get(position.marketSlug)?.symbol ?? position.marketSlug,
          label: marketBySlug.get(position.marketSlug)?.name ?? position.marketSlug,
          side: "long",
          leverage: position.multiplier ?? 1,
          collateralUsd: position.collateralValueUsd ?? 0,
          exposureUsd: (position.collateralValueUsd ?? 0) * (position.multiplier ?? 1),
          pnlUsd: 0,
          pnlPct: 0,
          status: position.status,
        })),
        openOrders: [],
        twapOrders: [],
        activity,
        strategies: [],
        rewards: {
          walletProfileId: wallet,
          claimableUsd: 0,
          earnedUsd: claimedRewards.reduce((sum, claim) => sum + claim.amount, 0),
          settledUsd: claimedRewards.reduce((sum, claim) => sum + claim.amount, 0),
          pendingUsd: 0,
        },
      },
    }
  },
}
