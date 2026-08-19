"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { getSwapAsset } from "@/app/lib/swap-system/catalog"
import type { UserAssetBalance } from "@/app/lib/swap-system"
import { useConvexProductWalletBalances } from "@/app/lib/swap-system/use-convex-wallet-balances"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"

export type DashboardPortfolioSummary = {
  /** Net Portfolio Value (Assets − Debt), aggregated across products. Umbrella excluded. */
  netValueUsd: number
  /** Value-weighted blended Net APY. Umbrella excluded. */
  netApyPct: number
}

/**
 * Global Net Value = the signed sum of the wallet's canonical product balances
 * (walletLiquid + lend + borrow + multiply buckets), with debt rows negative.
 * Non-LP tokens are valued off the live oracle (`priceFor`); LP rows keep their
 * stored canonical basis. Umbrella is NEVER part of productBalances, so it is
 * excluded by construction — matching the rule that Umbrella lives on its own page.
 *
 * This reconciles with the Wallet tab and the per-product tabs because it reads the
 * exact same `productBalances` source those surfaces read — no separate server snapshot.
 */
export function aggregateNetValueUsd(
  rows: readonly UserAssetBalance[],
  priceFor: (symbol: string) => number | undefined,
): number {
  let total = 0
  for (const row of rows) {
    const stored = row.valueUsd ?? 0
    const asset = getSwapAsset(row.assetId)
    const isLp = asset?.isLpToken ?? false
    const live = isLp ? undefined : priceFor(asset?.symbol ?? row.assetId)
    const magnitude = live != null && Number.isFinite(live) ? row.amount * live : Math.abs(stored)
    // productBalances encodes debt as a negative stored valueUsd; preserve that sign.
    total += (stored < 0 ? -1 : 1) * magnitude
  }
  return total
}

/**
 * The two Convex-sourced "Your Dashboard" figures — Net Value and Net APY.
 * Net Value is the client aggregate above (canonical productBalances, live-priced,
 * umbrella-excluded). Net APY still reads the server read-time blend for now; it moves
 * to a client net-equity-weighted aggregate in a follow-up. Kept as its own hook so it
 * mirrors the other dashboard data hooks and is mockable in component tests.
 */
export function useDashboardPortfolioSummary(walletId: string | undefined): DashboardPortfolioSummary {
  const balances = useConvexProductWalletBalances(walletId)
  const priceFor = useCanonicalPriceFor()
  const portfolio = useQuery(api.sandbox.transactions.getPortfolio, walletId ? { wallet: walletId } : "skip")

  return {
    netValueUsd: aggregateNetValueUsd(balances ?? [], priceFor),
    netApyPct: portfolio?.netApyPct ?? 0,
  }
}
