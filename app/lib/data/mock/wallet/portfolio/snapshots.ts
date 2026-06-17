import type { PortfolioTabKey } from "@/app/lib/data/providers/portfolio/types"

export type PortfolioSnapshotRecord = {
  walletProfileId: string
  timestamp: string
  totalValueUsd: number
  totalSuppliedUsd: number
  totalBorrowedUsd: number
  totalMultiplyExposureUsd: number
  totalEarnedUsd: number
}

export const PORTFOLIO_SNAPSHOTS: PortfolioSnapshotRecord[] = [
  {
    walletProfileId: "demo-wallet",
    timestamp: "2026-06-16T11:00:00.000Z",
    totalValueUsd: 28_200,
    totalSuppliedUsd: 13_400,
    totalBorrowedUsd: 1_100,
    totalMultiplyExposureUsd: 16_900,
    totalEarnedUsd: 11.8,
  },
  {
    walletProfileId: "demo-wallet",
    timestamp: "2026-06-16T23:00:00.000Z",
    totalValueUsd: 28_950,
    totalSuppliedUsd: 13_900,
    totalBorrowedUsd: 1_240,
    totalMultiplyExposureUsd: 17_200,
    totalEarnedUsd: 12.4,
  },
  {
    walletProfileId: "demo-wallet",
    timestamp: "2026-06-17T06:00:00.000Z",
    totalValueUsd: 29_400,
    totalSuppliedUsd: 14_100,
    totalBorrowedUsd: 1_300,
    totalMultiplyExposureUsd: 17_700,
    totalEarnedUsd: 12.9,
  },
  {
    walletProfileId: "demo-wallet",
    timestamp: "2026-06-17T09:00:00.000Z",
    totalValueUsd: 29_810,
    totalSuppliedUsd: 14_300,
    totalBorrowedUsd: 1_380,
    totalMultiplyExposureUsd: 17_900,
    totalEarnedUsd: 13.4,
  },
]

export function getWalletSnapshots(walletProfileId: string) {
  return PORTFOLIO_SNAPSHOTS.filter((snapshot) => snapshot.walletProfileId === walletProfileId).sort(
    (left, right) => left.timestamp.localeCompare(right.timestamp),
  )
}

export function getSnapshotRangeData(walletProfileId: string, tab: PortfolioTabKey) {
  const snapshots = getWalletSnapshots(walletProfileId)
  const last = snapshots[snapshots.length - 1]
  const base = last?.totalValueUsd ?? 10_000
  const spread =
    tab === "overview" ? 22 : tab === "lending" ? 18 : tab === "looping" ? 28 : 12

  return {
    "1H": Array.from({ length: 6 }, (_, index) => ({
      time: index,
      value: base - spread * 0.8 + index * (spread / 5),
      label: `${index}h`,
    })),
    "1D": Array.from({ length: 8 }, (_, index) => ({
      time: index,
      value: base - spread * 1.2 + index * (spread / 4),
      label: `${index}d`,
    })),
    "1W": Array.from({ length: 7 }, (_, index) => ({
      time: index,
      value: base - spread * 2 + index * (spread / 3),
      label: `W${index + 1}`,
    })),
    "1M": Array.from({ length: 7 }, (_, index) => ({
      time: index,
      value: base - spread * 2.4 + index * (spread / 2.2),
      label: `M${index + 1}`,
    })),
    "1Y": Array.from({ length: 12 }, (_, index) => ({
      time: index,
      value: base - spread * 3.5 + index * (spread / 2.8),
      label: `Y${index + 1}`,
    })),
    All: snapshots.map((snapshot) => ({
      time: new Date(snapshot.timestamp).getTime(),
      value: snapshot.totalValueUsd,
      label: new Date(snapshot.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })),
  }
}
