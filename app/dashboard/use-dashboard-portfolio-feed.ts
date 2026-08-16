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

// The stored history and the live headline must be on the SAME accounting basis, or the hero
// chart shows a false crash/spike. When the server that writes snapshots has not yet been
// redeployed with the current portfolio formula (e.g. before net-debt / Umbrella were folded in),
// its rows sit far from the live number. We detect that by comparing the NEWEST snapshot to the
// live value: if they disagree by more than this fraction, the whole series is treated as
// off-basis and we show just the current point rather than a misleading jump. (Phase 2.5)
const BASIS_TOLERANCE = 0.25

function feedFromSnapshots(
  snapshots: Array<{ at: number; totalValueUsd: number }>,
  portfolioValueUsd: number,
): ChartFeed {
  const chronological = [...snapshots].sort((a, b) => a.at - b.at)
  if (chronological.length === 0) return feedFromEndUsd(portfolioValueUsd)

  const last = chronological[chronological.length - 1]!
  const endUsd = Number.isFinite(portfolioValueUsd) && portfolioValueUsd > 0 ? portfolioValueUsd : last.totalValueUsd

  // Only trust the series when its newest point already agrees with the live basis.
  if (endUsd <= 0 || Math.abs(last.totalValueUsd - endUsd) > endUsd * BASIS_TOLERANCE) {
    return feedFromEndUsd(portfolioValueUsd)
  }

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
