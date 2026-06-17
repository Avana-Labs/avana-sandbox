import { getPortfolioHeroFeed } from "@/app/lib/chart-feeds"
import type { ChartRangeData } from "@/app/components/charts"
import type { PortfolioHeroData, PortfolioPageData } from "@/app/lib/data/providers/portfolio/types"
import { getWalletProfile } from "./profiles"
import { getWalletSnapshots } from "./snapshots"
import { getWalletSupplies } from "./supplies"
import { getWalletDebts } from "./debts"
import {
  getWalletCollaterals,
  getWalletMultiplyPositions,
  getWalletOpenOrders,
  getWalletTwapOrders,
} from "./positions"
import { getWalletActivity } from "./activity"
import { getWalletRewards } from "./rewards"

function buildHero(rangeData: ChartRangeData, overrides: Partial<PortfolioHeroData>) {
  return {
    headlineValue: overrides.headlineValue ?? "$0.00",
    headlineDelta: overrides.headlineDelta ?? "$0.00 (0.00%)",
    headlineMeta: overrides.headlineMeta,
    rangeData,
    actionLabels: overrides.actionLabels ?? ["Deposit", "Withdraw"],
    hideChart: overrides.hideChart,
    hideActions: overrides.hideActions,
    hideStats: overrides.hideStats,
    primaryActionLabel: overrides.primaryActionLabel ?? "Deposit",
    secondaryActionLabel: overrides.secondaryActionLabel ?? "Withdraw",
    statOneLabel: overrides.statOneLabel,
    statOneValue: overrides.statOneValue,
    statOneHelpText: overrides.statOneHelpText,
    statTwoLabel: overrides.statTwoLabel,
    statTwoValue: overrides.statTwoValue,
    statTwoHelpText: overrides.statTwoHelpText,
  }
}

function buildPortfolioRangeData(chartBase: number, chartVariance: number) {
  return getPortfolioHeroFeed({
    balance: "$0.00",
    delta: "$0.00 (0.00%) today",
    chartBase,
    chartVariance,
  }).rangeData
}

function computeHealthFactor(collateralUsd: number, maxLtv: number, borrowedUsd: number) {
  if (borrowedUsd <= 0) return null
  return (collateralUsd * (maxLtv / 100)) / borrowedUsd
}

export function assemblePortfolioPage(walletProfileId: string): PortfolioPageData {
  const walletProfile = getWalletProfile(walletProfileId)
  const snapshots = getWalletSnapshots(walletProfileId)
  const supplies = getWalletSupplies(walletProfileId)
  const debts = getWalletDebts(walletProfileId)
  const collaterals = getWalletCollaterals(walletProfileId)
  const multiplyPositions = getWalletMultiplyPositions(walletProfileId)
  const openOrders = getWalletOpenOrders(walletProfileId)
  const twapOrders = getWalletTwapOrders(walletProfileId)
  const activityRows = getWalletActivity(walletProfileId)
  const rewards = getWalletRewards(walletProfileId)

  const totalCollateralUsd = collaterals.reduce((sum, row) => sum + row.pool.collateralUsd, 0)
  const totalDebtUsd = debts.reduce((sum, row) => sum + row.borrowedUsd, 0)
  const availableToBorrowUsd = collaterals.reduce((sum, row) => sum + Math.max(0, row.pool.borrowPowerUsd - row.borrowedUsd), 0)
  const collateralHealthFactors = collaterals
    .map((row) => computeHealthFactor(row.pool.collateralUsd, row.pool.maxLtv, row.borrowedUsd))
    .filter((value): value is number => value !== null && Number.isFinite(value))
  const averageHealthFactor = collateralHealthFactors.length ? collateralHealthFactors.reduce((sum, value) => sum + value, 0) / collateralHealthFactors.length : null
  const totalSuppliedUsd = supplies.reduce((sum, row) => sum + row.suppliedUsd, 0)
  const totalEarnedUsd = supplies.reduce((sum, row) => sum + row.earnedUsd, 0)
  const averageApyPct = supplies.length ? supplies.reduce((sum, row) => sum + row.apyPct, 0) / supplies.length : 0
  const totalExposureUsd = multiplyPositions.reduce((sum, row) => sum + row.exposureUsd, 0)
  const openPositionCount = multiplyPositions.filter((row) => row.status === "open").length
  const netCarryPct = multiplyPositions.length
    ? multiplyPositions.reduce((sum, row) => sum + row.pnlPct, 0) / multiplyPositions.length
    : 0
  const settledToday = activityRows.filter((row) => row.status === "confirmed").length
  const pendingToday = activityRows.filter((row) => row.status === "pending").length

  const latestSnapshot = snapshots[snapshots.length - 1]
  const overviewRangeData = buildPortfolioRangeData(880, 14)
  const lendingRangeData = buildPortfolioRangeData(964, 42)
  const loopingRangeData = buildPortfolioRangeData(198, 18)
  const activityRangeData = buildPortfolioRangeData(42, 6)

  return {
    walletProfile,
    fetchedAt: new Date().toISOString(),
    heroByTab: {
      overview: buildHero(overviewRangeData, {
        headlineValue: `$${(latestSnapshot?.totalValueUsd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        headlineDelta: "$9.81K (3.41%) today",
        headlineMeta: "Wallet profile",
        actionLabels: ["Borrow", "Repay", "Deposit", "Withdraw"],
        primaryActionLabel: "Deposit",
        secondaryActionLabel: "Withdraw",
        statOneLabel: "Approved credit",
        statOneValue: `$${availableToBorrowUsd.toLocaleString("en-US")}`,
        statOneHelpText: "Borrow capacity across pledged collateral positions.",
        statTwoLabel: "Credit health",
        statTwoValue: averageHealthFactor ? averageHealthFactor.toFixed(2) : "—",
        statTwoHelpText: "Average health factor across active borrow-linked collateral.",
      }),
      lending: buildHero(lendingRangeData, {
        headlineValue: `$${totalSuppliedUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        headlineDelta: `$${totalEarnedUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} earned this month`,
        actionLabels: ["Supply assets", "Withdraw yield"],
        primaryActionLabel: "Supply assets",
        secondaryActionLabel: "Withdraw yield",
        statOneLabel: "Average APY",
        statOneValue: `${averageApyPct.toFixed(2)}%`,
        statOneHelpText: "Weighted average APY across supplied assets in the wallet.",
        statTwoLabel: "Earned",
        statTwoValue: `$${totalEarnedUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        statTwoHelpText: "Total yield already accrued by the portfolio.",
      }),
      looping: buildHero(loopingRangeData, {
        headlineValue: `$${totalExposureUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        headlineDelta: `${netCarryPct >= 0 ? "+" : ""}${netCarryPct.toFixed(2)}% net carry`,
        actionLabels: ["Increase loop", "Unwind loop"],
        primaryActionLabel: "Increase loop",
        secondaryActionLabel: "Unwind loop",
        statOneLabel: "Open positions",
        statOneValue: `${openPositionCount}`,
        statOneHelpText: "Open multiply positions in the wallet profile.",
        statTwoLabel: "Net carry",
        statTwoValue: `${netCarryPct >= 0 ? "+" : ""}${netCarryPct.toFixed(2)}%`,
        statTwoHelpText: "Average realized carry across the current multiply book.",
      }),
      activity: buildHero(activityRangeData, {
        headlineValue: `${activityRows.length}`,
        headlineDelta: `${settledToday} settled, ${pendingToday} pending`,
        actionLabels: ["Product", "Action", "Status"],
        hideChart: true,
        hideActions: true,
        hideStats: true,
        primaryActionLabel: "Product",
        secondaryActionLabel: "Action",
      }),
    },
    tabs: {
      borrow: {
        totalCollateralUsd,
        totalDebtUsd,
        availableToBorrowUsd,
        averageHealthFactor,
      },
      lend: {
        totalSuppliedUsd,
        totalEarnedUsd,
        averageApyPct,
      },
      multiply: {
        totalExposureUsd,
        openPositions: openPositionCount,
        netCarryPct,
      },
      activity: {
        totalEvents: activityRows.length,
        settledToday,
        pendingToday,
      },
    },
    borrow: {
      creditLines: {
        approvedUsd: availableToBorrowUsd,
        averageHealthFactor,
        currentLtvPct: totalCollateralUsd ? (totalDebtUsd / totalCollateralUsd) * 100 : 0,
        totalBorrowedUsd: totalDebtUsd,
        totalCollateralUsd,
      },
      collateralPositions: collaterals,
      debtPositions: debts.map((debt, index) => {
        const matchingCollateral = collaterals.find((row) => row.pool.id === debt.poolId)
        const fallbackCollateral = collaterals[index % collaterals.length] ?? collaterals[0]
        const resolvedCollateral = matchingCollateral ?? fallbackCollateral
        const healthFactor = computeHealthFactor(resolvedCollateral.pool.collateralUsd, resolvedCollateral.pool.maxLtv, debt.borrowedUsd)
        return {
          id: debt.id,
          pool: resolvedCollateral.pool,
          borrowedUsd: debt.borrowedUsd,
          healthFactor,
          borrowApr: debt.borrowAprPct,
          accruedInterestUsd: debt.accruedInterestUsd,
          dailyInterestUsd: debt.dailyInterestUsd,
        }
      }),
    },
    lend: {
      investments: supplies,
      strategyBuckets: [
        {
          title: "Conservative Strategy",
          description: "Stable assets with lower risk",
          badgeLabel: "4-8% APY range",
          badgeClassName:
            "rounded-xs border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-blue-700 dark:text-blue-400",
          accentClassName: "from-blue-500/[0.03]",
          pools: [
            { name: "Uniswap USDC-USDT", apy: "4.2%", tvl: "$88.4K", isUp: true, allocationUsd: 18_400 },
            { name: "Aave USDC", apy: "5.1%", tvl: "$76.2K", isUp: true, allocationUsd: 24_100 },
            { name: "Convex USDT", apy: "6.3%", tvl: "$41.9K", isUp: true, allocationUsd: 11_200 },
            { name: "Chainlink USDC", apy: "7.2%", tvl: "$28.5K", isUp: false, allocationUsd: 6_800 },
          ],
        },
        {
          title: "Moderate Strategy",
          description: "Balanced risk-reward ratio",
          badgeLabel: "8-15% APY range",
          badgeClassName:
            "rounded-xs border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-indigo-700 dark:text-indigo-400",
          accentClassName: "from-indigo-500/[0.03]",
          pools: [
            { name: "Compound ETH-USDC", apy: "12.5%", tvl: "$91.2K", isUp: true, allocationUsd: 31_800 },
            { name: "Rocket Pool stETH", apy: "9.8%", tvl: "$64.7K", isUp: true, allocationUsd: 15_300 },
            { name: "Balancer ETH-DAI", apy: "14.2%", tvl: "$53.8K", isUp: false, allocationUsd: 8_400 },
            { name: "Solana USDC", apy: "11.5%", tvl: "$72.1K", isUp: true, allocationUsd: 13_700 },
          ],
        },
        {
          title: "Aggressive Strategy",
          description: "High risk, high potential returns",
          badgeLabel: "15-40% APY range",
          badgeClassName:
            "rounded-xs border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-rose-700 dark:text-rose-400",
          accentClassName: "from-rose-500/[0.03]",
          pools: [
            { name: "Curve ETH-BTC", apy: "35.8%", tvl: "$39.6K", isUp: true, allocationUsd: 3_200 },
            { name: "Balancer WETH-DAI", apy: "28.4%", tvl: "$31.8K", isUp: false, allocationUsd: 2_400 },
            { name: "Pancakeswap BNB-USDT", apy: "42.1%", tvl: "$27.4K", isUp: true, allocationUsd: 1_500 },
            { name: "Sushiswap ETH-USDC", apy: "31.6%", tvl: "$44.1K", isUp: false, allocationUsd: 2_800 },
          ],
        },
      ],
    },
    multiply: {
      lpCollaterals: collaterals.map((record) => ({
        id: record.id,
        label: record.pool.name,
        tokens: [record.pool.visuals[0].symbol, record.pool.visuals[1].symbol],
        protocol: record.pool.venue,
        healthFactor: record.healthFactor ?? 0,
        collateralUsd: record.pool.collateralUsd,
        borrowPowerUsd: record.pool.borrowPowerUsd,
      })),
      positions: multiplyPositions,
      openOrders,
      twapOrders,
      history: activityRows.filter((row) => row.product === "multiply"),
    },
    activity: {
      rows: activityRows,
    },
    rewards,
  }
}
