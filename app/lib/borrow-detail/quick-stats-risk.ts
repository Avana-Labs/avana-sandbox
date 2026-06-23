import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { prngFromString } from "./prng"
import type { QuickStat } from "./types"

export function buildLiquidationRiskQuickStats(seed: string, totalBorrowedUsd: number): QuickStat[] {
  if (totalBorrowedUsd <= 0) {
    return [
      {
        id: "collateralsAtRisk",
        label: "Collaterals at Risk",
        value: "$0",
        tooltip: "Total value at risk of liquidation in positions with health score approaching liquidation",
      },
      {
        id: "eligibleForLiquidations",
        label: "Eligible for Liquidations",
        value: "$0",
        tooltip: "Total value at risk of liquidation in positions with health score below 1",
      },
    ]
  }

  const rng = prngFromString(`${seed}:liquidation-risk`)
  const atRiskUsd = Math.max(1_000, totalBorrowedUsd * (0.06 + rng() * 0.1))
  const eligibleUsd = Math.max(250, totalBorrowedUsd * (0.00035 + rng() * 0.0012))

  return [
    {
      id: "collateralsAtRisk",
      label: "Collaterals at Risk",
      value: formatCompactUsd(atRiskUsd),
      tooltip: "Total value at risk of liquidation in positions with health score approaching liquidation",
    },
    {
      id: "eligibleForLiquidations",
      label: "Eligible for Liquidations",
      value: formatCompactUsd(eligibleUsd),
      tooltip: "Total value at risk of liquidation in positions with health score below 1",
    },
  ]
}
