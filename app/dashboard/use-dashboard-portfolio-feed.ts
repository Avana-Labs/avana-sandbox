"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { ChartFeed, ChartPoint } from "@/app/components/charts"
import { formatChartValue } from "@/app/components/charts"

function makeRangeData(points: ChartPoint[]) {
  return {
    "1D": points,
    "1W": points,
    "1M": points,
    "3M": points,
    "1Y": points,
    All: points,
  }
}

function feedFromEndUsd(portfolioValueUsd: number): ChartFeed {
  const points = [{ time: Date.now(), value: portfolioValueUsd, label: "Now" }]
  return {
    headlineValue: formatChartValue("usd", portfolioValueUsd),
    headlineDelta: `${formatChartValue("usd", 0)} (0.00%)`,
    deltaTone: "positive",
    rangeData: makeRangeData(points),
    valueFormat: "usdCompact",
  }
}

function feedFromSnapshots(
  snapshots: Array<{ at: number; totalValueUsd: number }>,
  portfolioValueUsd: number,
): ChartFeed {
  const chronological = [...snapshots].sort((a, b) => a.at - b.at)
  if (chronological.length === 0) return feedFromEndUsd(portfolioValueUsd)

  const last = chronological[chronological.length - 1]!
  const endUsd = Number.isFinite(portfolioValueUsd) && portfolioValueUsd > 0 ? portfolioValueUsd : last.totalValueUsd
  const points: ChartPoint[] = chronological.map((snapshot, index) => {
    const isLast = index === chronological.length - 1
    return {
      time: index,
      value: isLast ? endUsd : snapshot.totalValueUsd,
      label: isLast ? "Now" : new Date(snapshot.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    }
  })
  if (points[points.length - 1]?.value !== endUsd) {
    points.push({ time: points.length, value: endUsd, label: "Now" })
  }

  const first = points[0]?.value ?? endUsd
  const changeAbs = endUsd - first
  const pct = first ? (changeAbs / first) * 100 : 0
  return {
    headlineValue: formatChartValue("usd", endUsd),
    headlineDelta: `${formatChartValue("usd", Math.abs(changeAbs))} (${Math.abs(pct).toFixed(2)}%)`,
    deltaTone: pct >= 0 ? "positive" : "negative",
    rangeData: makeRangeData(points),
    valueFormat: "usdCompact",
  }
}

/** Prefer Convex portfolioSnapshots; otherwise show only the current value. */
export function useDashboardPortfolioFeed(walletId: string | undefined, portfolioValueUsd: number): ChartFeed {
  const portfolio = useQuery(api.sandbox.transactions.getPortfolio, walletId ? { wallet: walletId } : "skip")

  return useMemo(() => {
    const snapshots = portfolio?.snapshots ?? []
    if (snapshots.length > 0) return feedFromSnapshots(snapshots, portfolioValueUsd)
    return feedFromEndUsd(portfolioValueUsd)
  }, [portfolio?.snapshots, portfolioValueUsd])
}
