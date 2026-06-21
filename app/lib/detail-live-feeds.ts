import { formatCompactUsd } from "@/app/lib/borrow-sim"
import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import type { MultiplyMarketRecord, MultiplySystemState } from "@/app/lib/multiply-engine"

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatFactor(value: number) {
  return `${value.toFixed(1)}x`
}

export function aggregateMultiplyMarketActivity(state: MultiplySystemState, marketId: string) {
  const market = state.markets[marketId]
  const positions = Object.values(state.positions).filter((position) => position.marketId === marketId)
  const totalCollateralUsd = positions.reduce((sum, position) => sum + position.collateralValueUsd, 0)
  const totalDebtUsd = positions.reduce((sum, position) => sum + position.debtValueUsd, 0)

  return {
    market,
    positions,
    totalCollateralUsd,
    totalDebtUsd,
    tvlUsd: totalCollateralUsd + (market?.economics.availableLiquidityUsd ?? 0),
    activePositions: positions.length,
  }
}

export function mergeMultiplyDetailWithSession(detail: MultiplyMarketDetail, state: MultiplySystemState): MultiplyMarketDetail {
  const activity = aggregateMultiplyMarketActivity(state, detail.id)
  if (!activity.market) return detail

  const utilizationPct =
    activity.totalCollateralUsd > 0
      ? Math.min(100, Math.round((activity.totalDebtUsd / Math.max(activity.totalCollateralUsd, 1)) * 100))
      : detail.supplyBorrow.utilization.points.at(-1)?.v ?? 0

  const lastSupplied = activity.tvlUsd
  const lastBorrowed = activity.totalDebtUsd

  return {
    ...detail,
    quickStats: detail.quickStats.map((stat) => {
      if (stat.id === "available") return { ...stat, value: formatCompactUsd(activity.market!.economics.availableLiquidityUsd) }
      if (stat.id === "supplyApy") return { ...stat, value: formatPct(activity.market!.economics.supplyApy) }
      if (stat.id === "borrowApy") return { ...stat, value: formatPct(activity.market!.economics.borrowApy) }
      if (stat.id === "maxLeverage") return { ...stat, value: formatFactor(activity.market!.risk.publicMaxMultiplier) }
      return stat
    }),
    supplyBorrow: {
      supplied: {
        ...detail.supplyBorrow.supplied,
        aggregate: lastSupplied,
        points: detail.supplyBorrow.supplied.points.map((point, index, points) =>
          index === points.length - 1 ? { ...point, v: Math.round(lastSupplied) } : point,
        ),
      },
      borrowed: {
        ...detail.supplyBorrow.borrowed,
        aggregate: lastBorrowed,
        points: detail.supplyBorrow.borrowed.points.map((point, index, points) =>
          index === points.length - 1 ? { ...point, v: Math.round(lastBorrowed) } : point,
        ),
      },
      utilization: {
        ...detail.supplyBorrow.utilization,
        aggregate: utilizationPct,
        points: detail.supplyBorrow.utilization.points.map((point, index, points) =>
          index === points.length - 1 ? { ...point, v: utilizationPct } : point,
        ),
      },
    },
    engagement: {
      ...detail.engagement,
      primary: {
        ...detail.engagement.primary,
        valueLabel: String(activity.activePositions),
      },
    },
  }
}

export function multiplyMarketChartBase(state: MultiplySystemState, marketId: string) {
  const activity = aggregateMultiplyMarketActivity(state, marketId)
  return activity.tvlUsd > 0 ? activity.tvlUsd : activity.market?.economics.availableLiquidityUsd ?? 0
}
