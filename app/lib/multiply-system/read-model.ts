import { formatCompactUsd } from "@/app/lib/borrow-sim"
import type { MultiplyMarketRecord, MultiplySystemState } from "@/app/lib/multiply-engine"
import { calculateMaxLeverageApy } from "@/app/lib/multiply-engine"
import { resolveMultiplyMarketDisplayMaxLeverage } from "@/app/lib/multiply-system/leverage-limits"
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import type { PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"
import { MULTIPLY_TOKEN_BORROW_APYS, MULTIPLY_TOKEN_LOGOS, MULTIPLY_TOKEN_SUPPLY_APYS } from "@/app/lib/multiply-sim"
import { resolveMultiplyTokenLogo } from "@/lib/multiply-token-logo"
import type { MultiplyMarketRow } from "@/app/lib/multiply-sim"
import { MULTIPLY_MARKET_CATALOG } from "./catalog"
import type { MultiplyTransactionHistoryItem, MultiplyTransactionResult, MultiplyWalletReadSnapshot } from "./contracts"
import { buildMockMultiplyRiskSnapshots } from "./mock"

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatFactor(value: number) {
  return `${value.toFixed(2)}x`
}

export type MultiplyTrendingSnapshot = {
  marketId: string
  label: string
  href: string
  maxLeverageLabel: string
  apyLabel: string
  apyPct: number
  availableLabel: string
  availableUsd: number
  collateralSymbol: string
  borrowSymbol: string
  collateralLogo: string
  borrowLogo: string
}

export function buildMultiplyTrendingSnapshots(markets: MultiplyMarketRecord[]): MultiplyTrendingSnapshot[] {
  return [...markets]
    .map((market) => {
      // Single-source the max-leverage figure so the trending card, markets table,
      // hero average and explore table all print the same number for a market. The
      // APY is a real financial formula computed from that same multiplier so the
      // headline leverage and its achievable APY stay consistent.
      const maxMultiplier = resolveMultiplyMarketDisplayMaxLeverage(market.risk.publicMaxMultiplier)
      const maxLeverageApy = calculateMaxLeverageApy({
        supplyApy: market.economics.supplyApy,
        borrowApy: market.economics.borrowApy,
        safeMaxMultiplier: maxMultiplier,
      })
      const collateralSymbol = market.collateralAsset.symbol
      const borrowSymbol = market.borrowAsset.symbol

      return {
        maxLeverageApy,
        snapshot: {
          marketId: market.id,
          label: `${collateralSymbol}-${borrowSymbol}`,
          href: `/multiply/markets/${market.id}`,
          maxLeverageLabel: formatFactor(maxMultiplier),
          apyPct: maxLeverageApy * 100,
          apyLabel: formatPct(maxLeverageApy),
          availableUsd: market.economics.availableLiquidityUsd,
          availableLabel: formatCompactUsd(market.economics.availableLiquidityUsd),
          collateralSymbol,
          borrowSymbol,
          collateralLogo: resolveMultiplyTokenLogo(collateralSymbol),
          borrowLogo: resolveMultiplyTokenLogo(borrowSymbol),
        },
      }
    })
    .filter((entry) => entry.maxLeverageApy > 0)
    .sort((left, right) => right.maxLeverageApy - left.maxLeverageApy)
    .slice(0, 3)
    .map((entry) => entry.snapshot)
}

export function catalogMarketToRow(market: MultiplyMarketRecord): MultiplyMarketRow {
  const collateralSymbol = market.collateralAsset.symbol
  const borrowSymbol = market.borrowAsset.symbol
  const collateralLogo = resolveMultiplyTokenLogo(collateralSymbol)
  const maxLeverage = resolveMultiplyMarketDisplayMaxLeverage(market.risk.publicMaxMultiplier)
  return {
    href: `/multiply/markets/${market.id}`,
    protocol: collateralSymbol,
    protocolName: market.collateralAsset.name,
    protocolLogo: collateralLogo,
    asset: borrowSymbol,
    assetName: market.borrowAsset.name,
    kind: "Loop",
    apy: formatPct(market.economics.estimatedMaxApy),
    apyLabel: "Estimated max APY at public max multiplier",
    points: formatCompactUsd(market.economics.availableLiquidityUsd),
    // The explore table renders the primary reward row under its MAX LEVERAGE
    // header, so that row must carry the single-sourced public max — the same
    // number the trending card, hero average and markets table show — not the
    // recommended cap (which lives in the secondary row for context).
    rewardRows: [
      {
        label: `Collateral factor ${Math.round(market.risk.collateralFactor * 100)}% · Liquidation threshold ${Math.round(market.risk.liquidationThreshold * 100)}%`,
        value: `Recommended max ${formatFactor(market.risk.recommendedMaxMultiplier)}`,
      },
      {
        label: `Collateral factor ${Math.round(market.risk.collateralFactor * 100)}% · Liquidation threshold ${Math.round(market.risk.liquidationThreshold * 100)}%`,
        value: formatFactor(maxLeverage),
      },
    ],
    collateralFactor: market.risk.collateralFactor,
    liquidationThreshold: market.risk.liquidationThreshold,
  }
}

export function buildMultiplyPageData(_walletId: string, state?: MultiplySystemState): MultiplyPageData {
  const markets = state ? Object.values(state.markets) : MULTIPLY_MARKET_CATALOG
  const lendRows = [...markets].sort((a, b) => a.rank - b.rank).map(catalogMarketToRow)

  // Aggregate the hero headline over EVERY loop market (not a 5-market sample) and
  // anchor it to available liquidity — the same figure the markets table lists per
  // row — so the headline reconciles with the table instead of showing a fraction.
  const totalLiquidityUsd = markets.reduce((sum, market) => sum + market.economics.availableLiquidityUsd, 0)
  const marketCount = markets.length
  const averageMaxApy =
    marketCount > 0 ? markets.reduce((sum, market) => sum + market.economics.estimatedMaxApy, 0) / marketCount : 0
  const averageMaxLeverage =
    marketCount > 0
      ? markets.reduce(
          (sum, market) => sum + resolveMultiplyMarketDisplayMaxLeverage(market.risk.publicMaxMultiplier),
          0,
        ) / marketCount
      : 0

  return {
    markets: [...markets].map((market) => ({
      symbol: market.collateralAsset.symbol,
      name: market.collateralAsset.name,
      price: market.collateralAsset.priceUsd,
      funding: market.economics.borrowApy,
      change: market.economics.estimatedMaxApy * 100,
      volume: market.economics.availableLiquidityUsd,
      maxLeverage: resolveMultiplyMarketDisplayMaxLeverage(market.risk.publicMaxMultiplier),
      longOi: 62,
      shortOi: 38,
    })),
    heroMetrics: { totalLiquidityUsd, marketCount, averageMaxApy, averageMaxLeverage },
    lendRows,
    trendingSnapshots: buildMultiplyTrendingSnapshots(markets),
    pageSize: 12,
    tokenBorrowApys: MULTIPLY_TOKEN_BORROW_APYS,
    tokenLogos: MULTIPLY_TOKEN_LOGOS,
    tokenSupplyApys: MULTIPLY_TOKEN_SUPPLY_APYS,
  }
}

/**
 * The wallet's multiply health factor is the WORST (minimum) active-position HF, not the
 * average. Multiply positions are isolated, so an average hides a position sitting near
 * liquidation behind a safe one — the safety hero must reflect the closest-to-liquidation
 * position. When positions exist but every one is debt-free the result is genuinely
 * infinite (report ∞ so the hero agrees with the per-row table, which renders "∞"); only a
 * wallet with no positions at all reports null.
 */
export function worstMultiplyHealthFactor(healthFactors: readonly number[], positionCount: number): number | null {
  const finite = healthFactors.filter((healthFactor) => Number.isFinite(healthFactor))
  if (finite.length > 0) return Math.min(...finite)
  return positionCount === 0 ? null : Number.POSITIVE_INFINITY
}

/**
 * Flat approximation of the blended liquidation threshold for the multiply credit-line
 * card. Kept identical here and in the SSR live source (live-source.ts) so the value
 * does not change on hydration. TODO(D3): derive per-market from each position's
 * liquidation LTV instead of a single factor.
 */
export const MULTIPLY_LIQUIDATION_THRESHOLD_FACTOR = 0.85

export function buildPortfolioMultiplyData(
  walletId: string,
  state: MultiplySystemState,
  history: MultiplyTransactionHistoryItem[] = [],
): PortfolioMultiplyTabData {
  const positions = Object.values(state.positions).filter((position) => position.walletId === walletId)
  const totalCollateralUsd = positions.reduce((sum, position) => sum + position.collateralValueUsd, 0)
  const totalDebtUsd = positions.reduce((sum, position) => sum + position.debtValueUsd, 0)
  const mappedHealthFactors = positions.map((position) =>
    position.healthFactor === "infinity" ? Number.POSITIVE_INFINITY : position.healthFactor,
  )
  // Worst-position, not average (see worstMultiplyHealthFactor). Field name kept as
  // averageHealthFactor for now to avoid a repo-wide contract rename.
  const averageHealthFactor = worstMultiplyHealthFactor(mappedHealthFactors, positions.length)

  return {
    creditLines: {
      approvedUsd: totalCollateralUsd,
      liquidationThresholdUsd: totalCollateralUsd * MULTIPLY_LIQUIDATION_THRESHOLD_FACTOR,
      averageHealthFactor,
      currentLtvPct: totalCollateralUsd > 0 ? (totalDebtUsd / totalCollateralUsd) * 100 : 0,
      totalBorrowedUsd: totalDebtUsd,
      totalCollateralUsd,
    },
    lpCollaterals: positions.map((position) => {
      const market = state.markets[position.marketId]!
      return {
        id: position.id,
        marketId: position.marketId,
        label: `${market.collateralAsset.symbol}/${market.borrowAsset.symbol}`,
        collateralToken: market.collateralAsset.symbol,
        borrowableToken: market.borrowAsset.symbol,
        multiplier: position.multiplier,
        protocol: "Avana Multiply",
        // Real value: a zero-debt position is genuinely infinite. The table renders
        // non-finite health factors as "∞" rather than a fabricated number.
        healthFactor: position.healthFactor === "infinity" ? Number.POSITIVE_INFINITY : position.healthFactor,
        collateralUsd: position.collateralValueUsd,
        borrowPowerUsd: Math.max(0, position.collateralValueUsd - position.debtValueUsd),
        debtUsd: position.debtValueUsd,
        ltvPct: position.ltv * 100,
        liquidationPriceUsd: position.liquidationPrice,
        netApyPct: position.netApy * 100,
        status: "open" as const,
      }
    }),
    positions: positions.map((position) => {
      const market = state.markets[position.marketId]!
      // PnL = net carry accrued on equity since the position opened. (The previous
      // formula reduced to equity − equity ≡ 0 for every position because
      // collateralValueUsd / multiplier === equity by definition.)
      const equityUsd = Math.max(0, position.collateralValueUsd - position.debtValueUsd)
      const elapsedYears = Math.max(0, Date.now() - position.openedAt) / MS_PER_YEAR
      const pnlUsd = equityUsd * position.netApy * elapsedYears
      return {
        id: position.id,
        symbol: market.collateralAsset.symbol,
        label: `${market.collateralAsset.symbol}/${market.borrowAsset.symbol}`,
        side: "long" as const,
        leverage: position.multiplier,
        collateralUsd: position.collateralValueUsd,
        exposureUsd: position.collateralValueUsd,
        pnlUsd,
        pnlPct: equityUsd > 0 ? (pnlUsd / equityUsd) * 100 : 0,
        status: "open" as const,
      }
    }),
    openOrders: [],
    twapOrders: [],
    history: buildMultiplyActivityHistory(walletId, history),
  }
}

export function buildMultiplyWalletSnapshot(
  walletId: string,
  state: MultiplySystemState,
  transactionHistory: MultiplyTransactionHistoryItem[],
): MultiplyWalletReadSnapshot {
  const portfolio = buildPortfolioMultiplyData(walletId, state, transactionHistory)
  const walletPositions = Object.values(state.positions).filter((position) => position.walletId === walletId)
  return {
    walletId,
    transactionHistory,
    metrics: {
      collateralValueUsd: portfolio.creditLines.totalCollateralUsd,
      debtValueUsd: portfolio.creditLines.totalBorrowedUsd,
      multiplier:
        portfolio.positions.length > 0
          ? portfolio.positions.reduce((sum, position) => sum + position.leverage, 0) / portfolio.positions.length
          : 1,
      ltv: portfolio.creditLines.currentLtvPct / 100,
      // Collapse both "no positions" (null) and "positions but all debt-free" (∞)
      // to the canonical "infinity" sentinel this field uses across the system.
      healthFactor: Number.isFinite(portfolio.creditLines.averageHealthFactor)
        ? (portfolio.creditLines.averageHealthFactor as number)
        : "infinity",
      netApy:
        walletPositions.length > 0
          ? walletPositions.reduce((sum, position) => sum + position.netApy, 0) / walletPositions.length
          : 0,
    },
    riskSnapshots: buildMockMultiplyRiskSnapshots(state).filter((snapshot) =>
      Object.values(state.positions).some(
        (position) => position.walletId === walletId && position.marketId === snapshot.marketId,
      ),
    ),
  }
}

export function buildSyntheticReceipts(history: MultiplyTransactionHistoryItem[]): MultiplyTransactionResult[] {
  return history.map((item) => ({
    id: item.id,
    hash: item.hash,
    status: item.status,
    actionType: item.kind,
    simulated: item.simulated,
    timestamp: item.timestamp,
  }))
}

export function buildMultiplyActivityHistory(
  walletId: string,
  history: MultiplyTransactionHistoryItem[],
): PortfolioMultiplyTabData["history"] {
  return history
    .filter((item) => item.walletId === walletId)
    .map((item) => {
      // A deleverage that unwinds all the way to 1.00x is a close, not a "Reduce".
      // Treat it as one so the activity log reads "Close · Position closed".
      const isClose = item.kind === "close" || (item.kind === "deleverage" && item.multiplierAfter <= 1.0001)
      return {
        id: item.id,
        at: new Date(item.timestamp).toISOString(),
        product: "multiply" as const,
        kind: item.kind === "multiply" ? ("open" as const) : isClose ? ("close" as const) : ("reduce" as const),
        status: item.status === "success" ? ("confirmed" as const) : ("failed" as const),
        amountUsd: item.amountUsd,
        primaryLabel:
          item.kind === "multiply" ? "Simulated multiply" : isClose ? "Simulated close" : "Simulated deleverage",
        secondaryLabel: isClose
          ? "Position closed"
          : `${item.multiplierBefore.toFixed(2)}x → ${item.multiplierAfter.toFixed(2)}x`,
        txHash: item.hash,
      }
    })
}

function formatRelativeAge(elapsedMs: number) {
  const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000))
  if (totalSeconds < 60) return `${totalSeconds}s`
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return `${totalHours}h`
  return `${Math.floor(totalHours / 24)}d`
}

export function mapMultiplyHistoryToDetailRows(
  history: MultiplyTransactionHistoryItem[],
  collateralSymbol: string,
  borrowableSymbol: string,
) {
  const now = Date.now()
  return history.map((item) => ({
    id: item.id,
    at: new Date(item.timestamp).toISOString(),
    timeLabel: formatRelativeAge(now - item.timestamp),
    kind: item.kind === "multiply" ? ("open" as const) : ("reduce" as const),
    amountLabel: `${item.multiplierBefore.toFixed(2)}x → ${item.multiplierAfter.toFixed(2)}x`,
    counterpartyLabel: `${collateralSymbol}/${borrowableSymbol}`,
    walletLabel: "Sandbox wallet",
    txHashShort: item.hash.slice(0, 10),
  }))
}
