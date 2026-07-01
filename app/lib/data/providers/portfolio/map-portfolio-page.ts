import { CHART_RANGE_LABELS, type ChartPoint, type ChartRangeData, type ChartRangeOption } from "@/app/components/charts"
import { assertStableRecordIds, dedupeByStableId } from "@/app/lib/data/core/source-runtime"
import { getPortfolioHeroFeed } from "@/app/lib/chart-feeds"
import { calculateLiquidationNumberUsd } from "./liquidation"
import type { PortfolioPageData, PortfolioHeroData, PortfolioTabKey } from "./types"
import type { PortfolioPageRecords, PortfolioSnapshotRecord } from "./source"

function buildHero(rangeData?: ChartRangeData, overrides: Partial<PortfolioHeroData> = {}): PortfolioHeroData {
  return {
    ...(rangeData ? { rangeData } : {}),
    ...overrides,
  }
}

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function computeHealthFactor(collateralUsd: number, maxLtv: number, borrowedUsd: number) {
  if (borrowedUsd <= 0) return null
  return (collateralUsd * (maxLtv / 100)) / borrowedUsd
}

const RANGE_LENGTH: Record<ChartRangeOption, number> = {
  "1H": 24,
  "1D": 63,
  "1W": 63,
  "1M": 63,
  "1Y": 63,
  All: 63,
}

const RANGE_SEED: Record<ChartRangeOption, number> = {
  "1H": 11,
  "1D": 37,
  "1W": 73,
  "1M": 131,
  "1Y": 197,
  All: 251,
}

function hashString(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function seededRandom(seed: number): () => number {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

function interpolateSeries(anchorValues: number[], count: number): number[] {
  if (anchorValues.length === 0) return []
  if (anchorValues.length === 1) return Array.from({ length: count }, () => anchorValues[0])

  return Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 0 : index / (count - 1)
    const scaled = progress * (anchorValues.length - 1)
    const leftIndex = Math.floor(scaled)
    const rightIndex = Math.min(anchorValues.length - 1, leftIndex + 1)
    const localProgress = scaled - leftIndex
    const left = anchorValues[leftIndex]
    const right = anchorValues[rightIndex]
    return left + (right - left) * localProgress
  })
}

function enrichInterpolatedSeries(anchorValues: number[], count: number, seedKey: string, range: ChartRangeOption): number[] {
  const baseline = interpolateSeries(anchorValues, count)
  if (!baseline.length) return []

  const seed = hashString(`${seedKey}:${range}`) + RANGE_SEED[range]
  const random = seededRandom(seed)
  const volatility =
    baseline.length > 1
      ? baseline.slice(1).reduce((sum, value, index) => sum + Math.abs(value - baseline[index]), 0) / (baseline.length - 1)
      : Math.max(Math.abs(baseline[0]) * 0.015, 12)
  const noiseScale = Math.max(volatility * (range === "1H" ? 0.6 : range === "1D" ? 0.85 : 1.1), Math.abs(baseline[0]) * 0.004)

  let velocity = 0
  const enriched = baseline.map((value, index) => {
    if (index === 0 || index === baseline.length - 1) return Math.round(value * 100) / 100
    const previous = baseline[index - 1]
    const next = baseline[index + 1]
    const curvature = ((previous + next) / 2 - value) * 0.18
    velocity = velocity * 0.68 + curvature + (random() - 0.5) * noiseScale
    return Math.round((value + velocity) * 100) / 100
  })

  enriched[0] = Math.round(baseline[0] * 100) / 100
  enriched[enriched.length - 1] = Math.round(baseline[baseline.length - 1] * 100) / 100

  return enriched
}

function attachLabels(values: number[], range: ChartRangeOption): ChartPoint[] {
  const labels = CHART_RANGE_LABELS[range]
  const tickIndexes = labels.map((_, index) => Math.round((index / (labels.length - 1)) * (values.length - 1)))

  return values.map((value, index) => {
    const labelIndex = tickIndexes.findIndex((tickIndex, tickPosition) => {
      const nextTick = tickIndexes[tickPosition + 1] ?? values.length
      return index >= tickIndex && index < nextTick
    })

    return {
      time: index,
      value,
      label: labels[labelIndex] ?? labels[labels.length - 1],
    }
  })
}

function pickAnchorValues(snapshots: PortfolioSnapshotRecord[], selector: (snapshot: PortfolioSnapshotRecord) => number, range: ChartRangeOption) {
  const values = snapshots.map(selector)
  if (range === "1H") return values.slice(-4)
  if (range === "1D") return values.slice(-6)
  if (range === "1W") return values.slice(-8)
  if (range === "1M") return values.slice(-10)
  if (range === "1Y") return values
  return values
}

function buildAllRangeFromSnapshots(snapshots: PortfolioSnapshotRecord[], selector: (snapshot: PortfolioSnapshotRecord) => number): ChartPoint[] {
  const anchorValues = snapshots.map(selector)
  const series = enrichInterpolatedSeries(anchorValues, RANGE_LENGTH.All, `${snapshots[0]?.walletProfileId ?? "wallet"}:all`, "All")
  const anchorIndexes = snapshots.map((_, index) => Math.round((index / Math.max(snapshots.length - 1, 1)) * (series.length - 1)))

  return series.map((value, index) => {
    const labelIndex = anchorIndexes.findIndex((anchorIndex, anchorPosition) => {
      const nextAnchor = anchorIndexes[anchorPosition + 1] ?? series.length
      return index >= anchorIndex && index < nextAnchor
    })
    const snapshot = snapshots[Math.max(0, labelIndex)]

    return {
      time: index,
      value,
      label:
        snapshot
          ? new Date(snapshot.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : CHART_RANGE_LABELS.All[CHART_RANGE_LABELS.All.length - 1],
    }
  })
}

function buildRangeDataFromSnapshots(
  snapshots: PortfolioSnapshotRecord[],
  selector: (snapshot: PortfolioSnapshotRecord) => number,
  seedKey: string,
): ChartRangeData {
  return {
    "1H": attachLabels(enrichInterpolatedSeries(pickAnchorValues(snapshots, selector, "1H"), RANGE_LENGTH["1H"], seedKey, "1H"), "1H"),
    "1D": attachLabels(enrichInterpolatedSeries(pickAnchorValues(snapshots, selector, "1D"), RANGE_LENGTH["1D"], seedKey, "1D"), "1D"),
    "1W": attachLabels(enrichInterpolatedSeries(pickAnchorValues(snapshots, selector, "1W"), RANGE_LENGTH["1W"], seedKey, "1W"), "1W"),
    "1M": attachLabels(enrichInterpolatedSeries(pickAnchorValues(snapshots, selector, "1M"), RANGE_LENGTH["1M"], seedKey, "1M"), "1M"),
    "1Y": attachLabels(enrichInterpolatedSeries(pickAnchorValues(snapshots, selector, "1Y"), RANGE_LENGTH["1Y"], seedKey, "1Y"), "1Y"),
    All: buildAllRangeFromSnapshots(snapshots, selector),
  }
}

function buildFallbackRangeData(chartBase: number, chartVariance: number) {
  return getPortfolioHeroFeed({
    balance: "$0.00",
    delta: "$0.00 (0.00%) today",
    chartBase,
    chartVariance,
  }).rangeData
}

function getRangeData(
  snapshots: PortfolioSnapshotRecord[],
  selector: (snapshot: PortfolioSnapshotRecord) => number,
  fallbackBase: number,
  fallbackVariance: number,
  seedKey: string,
) {
  return snapshots.length
    ? buildRangeDataFromSnapshots(snapshots, selector, seedKey)
    : buildFallbackRangeData(fallbackBase, fallbackVariance)
}

export function mapPortfolioPage(records: PortfolioPageRecords): PortfolioPageData {
  const { walletProfile, snapshots, supplies, debts, collaterals, multiplyCreditLines, multiplyCollaterals, multiplyPositions, openOrders, twapOrders, activity, strategies, rewards } =
    records
  const stripId = <T extends { id: string }>(record: T): Omit<T, "id"> => {
    const { id, ...rest } = record
    void id
    return rest
  }
  const walletSnapshots = dedupeByStableId(
    snapshots.map((snapshot, index) => ({ ...snapshot, id: `${snapshot.walletProfileId}:${snapshot.timestamp}:${index}` })),
    "portfolio snapshots",
  ).map(stripId)
  const walletSupplies = assertStableRecordIds(dedupeByStableId(supplies, "portfolio supplies"), "portfolio supplies")
  const walletDebts = assertStableRecordIds(dedupeByStableId(debts, "portfolio debts"), "portfolio debts")
  const walletCollaterals = assertStableRecordIds(dedupeByStableId(collaterals, "portfolio collaterals"), "portfolio collaterals")
  const walletMultiplyCollaterals = assertStableRecordIds(
    dedupeByStableId(multiplyCollaterals, "portfolio multiply collaterals"),
    "portfolio multiply collaterals",
  )
  const walletMultiplyPositions = assertStableRecordIds(
    dedupeByStableId(multiplyPositions, "portfolio multiply positions"),
    "portfolio multiply positions",
  )
  const walletOpenOrders = assertStableRecordIds(dedupeByStableId(openOrders, "portfolio open orders"), "portfolio open orders")
  const walletTwapOrders = assertStableRecordIds(dedupeByStableId(twapOrders, "portfolio twap orders"), "portfolio twap orders")
  const walletActivity = assertStableRecordIds(dedupeByStableId(activity, "portfolio activity"), "portfolio activity")
  const walletStrategies = dedupeByStableId(
    strategies.map((strategy) => ({ ...strategy, id: strategy.title })),
    "portfolio strategies",
  ).map(stripId)

  const totalCollateralUsd = walletCollaterals.reduce((sum, row) => sum + row.pool.collateralUsd, 0)
  const totalDebtUsd = walletDebts.reduce((sum, row) => sum + row.borrowedUsd, 0)
  const availableToBorrowUsd = walletCollaterals.reduce((sum, row) => sum + Math.max(0, row.pool.borrowPowerUsd - row.borrowedUsd), 0)
  const liquidationThresholdUsd = calculateLiquidationNumberUsd(
    walletCollaterals.map((row) => ({
      borrowedUsd: row.borrowedUsd,
      referenceBorrowedUsd: row.borrowedUsd,
      referenceLiquidationUsd: row.pool.liquidationUsd,
    })),
  )
  const currentLtvPct = totalCollateralUsd ? (totalDebtUsd / totalCollateralUsd) * 100 : 0
  const collateralHealthFactors = walletCollaterals
    .map((row) => computeHealthFactor(row.pool.collateralUsd, row.pool.maxLtv, row.borrowedUsd))
    .filter((value): value is number => value !== null && Number.isFinite(value))
  const averageHealthFactor = collateralHealthFactors.length
    ? collateralHealthFactors.reduce((sum, value) => sum + value, 0) / collateralHealthFactors.length
    : null
  const totalSuppliedUsd = walletSupplies.reduce((sum, row) => sum + row.suppliedUsd, 0)
  const totalEarnedUsd = walletSupplies.reduce((sum, row) => sum + row.earnedUsd, 0)
  const averageApyPct = walletSupplies.length ? walletSupplies.reduce((sum, row) => sum + row.apyPct, 0) / walletSupplies.length : 0
  const heroByTab: Record<PortfolioTabKey, PortfolioHeroData> = {
    overview: buildHero(undefined, {
      headlineValue: formatUsd(availableToBorrowUsd),
      headlineDelta: `▲ ${currentLtvPct.toFixed(2)}% current LTV`,
    }),
    lending: buildHero(
      getRangeData(walletSnapshots, (snapshot) => snapshot.totalSuppliedUsd, totalSuppliedUsd || 964, 42, `${walletProfile.id}:lending`),
      {
        headlineValue: formatUsd(totalSuppliedUsd),
        headlineDelta: `${formatUsd(totalEarnedUsd)} earned this month`,
        statOneValue: `${averageApyPct.toFixed(2)}%`,
        statTwoValue: formatUsd(totalEarnedUsd),
      },
    ),
    looping: buildHero(
      getRangeData(walletSnapshots, (snapshot) => snapshot.totalMultiplyExposureUsd, multiplyCreditLines.approvedUsd || 198, 18, `${walletProfile.id}:looping`),
      {
        headlineValue: formatUsd(multiplyCreditLines.approvedUsd),
        headlineDelta: `${multiplyCreditLines.averageHealthFactor?.toFixed(2) ?? "—"} health factor`,
        statOneValue: `${multiplyCreditLines.currentLtvPct.toFixed(2)}%`,
        statTwoValue: formatUsd(multiplyCreditLines.totalBorrowedUsd),
      },
    ),
    activity: buildHero(
      getRangeData(walletSnapshots, (snapshot) => snapshot.totalEarnedUsd, Math.max(walletActivity.length, 1), 6, `${walletProfile.id}:activity`),
    ),
  }

  return {
    walletProfile,
    fetchedAt: new Date().toISOString(),
    heroByTab,
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
      multiply: {},
      activity: {
        totalEvents: walletActivity.length,
      },
    },
    borrow: {
      creditLines: {
        approvedUsd: availableToBorrowUsd,
        liquidationThresholdUsd,
        averageHealthFactor,
        currentLtvPct,
        totalBorrowedUsd: totalDebtUsd,
        totalCollateralUsd,
      },
      collateralPositions: walletCollaterals.map((row) => ({
        ...row,
        remainingBorrowPowerUsd: Math.max(0, row.pool.borrowPowerUsd - row.borrowedUsd),
        liquidationThresholdUsd: row.pool.liquidationUsd,
        feesLabel: formatUsd(row.feesUsd),
      })),
      debtPositions: walletDebts.map((debt, index) => {
        const matchingCollateral = walletCollaterals.find((row) => row.pool.id === debt.poolId)
        const fallbackCollateral = walletCollaterals[index % walletCollaterals.length] ?? walletCollaterals[0]
        const resolvedCollateral = matchingCollateral ?? fallbackCollateral
        const healthFactor = computeHealthFactor(resolvedCollateral.pool.collateralUsd, resolvedCollateral.pool.maxLtv, debt.borrowedUsd)

        return {
          id: debt.id,
          pool: resolvedCollateral.pool,
          debtAssetSymbol: debt.debtAssetSymbol,
          borrowedUsd: debt.borrowedUsd,
          liquidationThresholdUsd: resolvedCollateral.pool.liquidationUsd,
          healthFactor,
          borrowApr: debt.borrowAprPct,
          accruedInterestUsd: debt.accruedInterestUsd,
          dailyInterestUsd: debt.dailyInterestUsd,
        }
      }),
    },
    lend: {
      investments: walletSupplies,
      positions: walletSupplies,
      strategyBuckets: walletStrategies,
      history: [],
    },
    multiply: {
      creditLines: {
        approvedUsd: multiplyCreditLines.approvedUsd,
        liquidationThresholdUsd: multiplyCreditLines.liquidationThresholdUsd,
        averageHealthFactor: multiplyCreditLines.averageHealthFactor,
        currentLtvPct: multiplyCreditLines.currentLtvPct,
        totalBorrowedUsd: multiplyCreditLines.totalBorrowedUsd,
        totalCollateralUsd: multiplyCreditLines.totalCollateralUsd,
      },
      lpCollaterals: walletMultiplyCollaterals.map((record) => ({
        id: record.id,
        marketId: record.id.split(":").pop() ?? record.id,
        label: record.label,
        collateralToken: record.collateralToken,
        borrowableToken: record.borrowableToken,
        multiplier: record.multiplier,
        protocol: record.protocol,
        healthFactor: record.healthFactor,
        collateralUsd: record.collateralUsd,
        borrowPowerUsd: record.borrowPowerUsd,
        debtUsd: record.collateralUsd - record.borrowPowerUsd,
        ltvPct: record.collateralUsd > 0 ? ((record.collateralUsd - record.borrowPowerUsd) / record.collateralUsd) * 100 : 0,
        liquidationPriceUsd: null,
        netApyPct: 0,
        status: "open" as const,
      })),
      positions: walletMultiplyPositions,
      openOrders: walletOpenOrders,
      twapOrders: walletTwapOrders,
      history: walletActivity.filter((row) => row.product === "multiply"),
    },
    activity: {
      rows: walletActivity,
    },
    rewards,
  }
}
