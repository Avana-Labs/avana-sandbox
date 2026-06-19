import {
  calculateCreditMetrics,
  currentCollateralValueUsd6,
  formatFixed,
  totalDebtValueUsd6,
  type BorrowSystemState,
} from "@/app/lib/credit-engine"
import type { BorrowAssetVisual, BorrowPoolRow, BorrowableAsset } from "@/app/lib/borrow-sim"
import type { HomeCollateralPool } from "@/app/lib/home-sim"

function fixedToNumber(value: bigint, decimals: number) {
  return Number.parseFloat(formatFixed(value, decimals))
}

function visualToUi(visual: BorrowSystemState["markets"][string]["display"]["visuals"][number]): BorrowAssetVisual {
  return {
    symbol: visual.symbol,
    shortLabel: visual.shortLabel,
    iconUrl: visual.iconUrl ?? undefined,
    bgClass: visual.bgClassName,
    textClass: visual.textClassName,
  }
}

function venueChipLabel(venue: string) {
  if (venue.toLowerCase().includes("uniswap")) return "Uniswap"
  if (venue.toLowerCase().includes("curve")) return "Curve"
  if (venue.toLowerCase().includes("balancer")) return "Balancer"
  if (venue.toLowerCase().includes("aerodrome")) return "Aerodrome"
  return venue
}

function marketDebtUsd6(state: BorrowSystemState, walletId: string, marketId: string) {
  const account = state.accounts[walletId]
  if (!account) return 0n
  return account.debtPositions
    .filter((position) => position.marketId === marketId)
    .reduce((sum, position) => sum + position.principalBorrowedUsd6, 0n)
}

export function selectBorrowMarketSummaries(state: BorrowSystemState, walletId: string): BorrowPoolRow[] {
  const account = state.accounts[walletId]
  const metrics = calculateCreditMetrics(state, walletId)
  const riskPremiumBps = Math.round(fixedToNumber(metrics.riskPremiumWad, 18) * 10_000)

  return Object.values(state.markets).map((market) => {
    const position = account?.collateralPositions.find((row) => row.marketId === market.id)
    const positionUsd = position ? fixedToNumber(currentCollateralValueUsd6(position, market), 6) : fixedToNumber(market.snapshot.lpTokenPriceUsd6, 6) * 1.75
    const feeApyPct = fixedToNumber(market.snapshot.feeApyWad, 18) * 100

    return {
      id: market.id,
      name: market.display.name,
      venue: market.display.venue,
      feeTier: market.display.feeTier,
      tvlUsd: fixedToNumber(market.snapshot.totalLiquidityUsd6, 6),
      spoke: market.spokeId,
      ltv: fixedToNumber(market.riskConfig.collateralFactorWad, 18) * 100,
      dexes: [{ id: market.display.venue.toLowerCase(), label: venueChipLabel(market.display.venue) }],
      borrowableTokens: market.relations.supportedBorrowAssetIds
        .map((assetId) => state.assets[assetId])
        .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
        .slice(0, 5)
        .map((asset) => visualToUi(asset.display.visual)),
      aprMin: Math.max(0, feeApyPct - 0.6),
      aprMax: feeApyPct + 0.6,
      availableUsd: fixedToNumber(market.snapshot.availableUsd6, 6),
      riskPremiumBps,
      visuals: market.display.visuals.map(visualToUi) as [BorrowAssetVisual, BorrowAssetVisual],
      collateralExampleUsd: positionUsd,
      trendUp: feeApyPct >= 4,
      trendValues: [0.62, 0.66, 0.64, 0.7, 0.73].map((value) => value * feeApyPct),
      events:
        position && marketDebtUsd6(state, walletId, market.id) > 0n
          ? [{ label: "Borrow active", tone: "warning" }]
          : position
            ? [{ label: "Collateral supplied", tone: "positive" }]
            : undefined,
    }
  })
}

export function selectBorrowableAssets(state: BorrowSystemState, walletId: string, marketId?: string): BorrowableAsset[] {
  const account = state.accounts[walletId]
  const metrics = calculateCreditMetrics(state, walletId)
  const supported = marketId ? new Set(state.markets[marketId]?.relations.supportedBorrowAssetIds ?? []) : null
  const walletBalanceLabel = account ? `$${fixedToNumber(account.walletBalanceUsd6, 6).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "$0"

  return Object.values(state.assets)
    .filter((asset) => !supported || supported.has(asset.id))
    .map((asset) => {
      const totalLiquidityUsd = fixedToNumber(asset.snapshot.availableLiquidityUsd6 + asset.snapshot.totalBorrowedUsd6, 6)
      const utilization = totalLiquidityUsd > 0 ? (fixedToNumber(asset.snapshot.totalBorrowedUsd6, 6) / totalLiquidityUsd) * 100 : 0

      return {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.display.name,
        subtitle: asset.display.subtitle,
        borrowApr: (fixedToNumber(asset.borrowConfig.baseBorrowAprWad + metrics.riskPremiumWad, 18) * 100),
        totalBorrowedUsd: fixedToNumber(asset.snapshot.totalBorrowedUsd6, 6),
        utilization,
        availableUsd: fixedToNumber(asset.snapshot.availableLiquidityUsd6, 6),
        walletBalanceLabel,
        hasWalletBalance: Boolean(account && account.walletBalanceUsd6 > 0n),
        visual: visualToUi(asset.display.visual),
        trendUp: asset.snapshot.priceChange24hWad >= 0n,
        trendValues: [0.94, 0.98, 1.01, 0.99, 1.03].map((value) => value * utilization),
        category: asset.display.category,
      }
    })
}

export function selectBorrowCollateralPools(state: BorrowSystemState, walletId: string): HomeCollateralPool[] {
  const account = state.accounts[walletId]
  if (!account) return []

  return account.collateralPositions
    .map((position) => {
      const market = state.markets[position.marketId]
      if (!market) return null
      const collateralUsd = fixedToNumber(currentCollateralValueUsd6(position, market), 6)
      return {
        id: market.id,
        name: market.display.name,
        venue: market.display.venue,
        category: `${market.display.venue} ${market.display.feeTier}`,
        collateralUsd,
        maxLtv: fixedToNumber(market.riskConfig.collateralFactorWad, 18) * 100,
        borrowPowerUsd: fixedToNumber(metricsForPosition(state, walletId, position.marketId).creditLimitUsd6, 6),
        liquidationUsd: fixedToNumber(metricsForPosition(state, walletId, position.marketId).liquidationValueUsd6, 6),
        pairApr: fixedToNumber(market.snapshot.feeApyWad, 18) * 100,
        visuals: market.display.visuals.map((visual) => ({
          symbol: visual.symbol,
          shortLabel: visual.shortLabel,
          bgClassName: visual.bgClassName,
          textClassName: visual.textClassName,
        })) as HomeCollateralPool["visuals"],
      }
    })
    .filter((pool): pool is HomeCollateralPool => Boolean(pool))
}

function metricsForPosition(state: BorrowSystemState, walletId: string, marketId: string) {
  const base = state.accounts[walletId]
  if (!base) throw new Error(`Unknown wallet ${walletId}`)
  const scoped: BorrowSystemState = {
    ...state,
    accounts: {
      [walletId]: {
        ...base,
        collateralPositions: base.collateralPositions.filter((position) => position.marketId === marketId),
        debtPositions: base.debtPositions.filter((position) => position.marketId === marketId),
      },
    },
  }
  return calculateCreditMetrics(scoped, walletId)
}

export function selectInitialBorrowDebts(state: BorrowSystemState, walletId: string) {
  const account = state.accounts[walletId]
  if (!account) return {} as Record<string, number>

  return Object.fromEntries(
    account.collateralPositions.map((position) => [
      position.marketId,
      fixedToNumber(
        account.debtPositions
          .filter((debt) => debt.marketId === position.marketId)
          .reduce((sum, debt) => sum + debt.principalBorrowedUsd6, 0n),
        6,
      ),
    ]),
  )
}

export function selectWalletBorrowSnapshot(state: BorrowSystemState, walletId: string) {
  const account = state.accounts[walletId]
  if (!account) throw new Error(`Unknown wallet ${walletId}`)
  const metrics = calculateCreditMetrics(state, walletId)
  return {
    totalBorrowedUsd: fixedToNumber(totalDebtValueUsd6(account), 6),
    availableCreditUsd: fixedToNumber(metrics.availableCreditUsd6, 6),
    totalCollateralUsd: fixedToNumber(metrics.poolCollateralValueUsd6, 6),
    liquidationValueUsd: fixedToNumber(metrics.liquidationValueUsd6, 6),
    healthFactor: metrics.healthFactorWad > 0n ? fixedToNumber(metrics.healthFactorWad, 18) : null,
  }
}
