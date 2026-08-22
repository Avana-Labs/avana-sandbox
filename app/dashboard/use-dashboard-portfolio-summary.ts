"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { getSwapAsset } from "@/app/lib/swap-system/catalog"
import type { UserAssetBalance } from "@/app/lib/swap-system"
import { buildDashboardWalletBalanceRows } from "@/app/lib/swap-system"
import { useConvexProductWalletBalances } from "@/app/lib/swap-system/use-convex-wallet-balances"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import {
  useBorrowSessionContext,
  useLendSessionContext,
  useMultiplySessionContext,
} from "@/app/lib/avana-session/avana-sessions-provider"
import { useHasMounted } from "@/app/lib/ui/use-has-mounted"
import { buildPortfolioMultiplyData } from "@/app/lib/multiply-system/read-model"
import { buildPortfolioLendData } from "@/app/lib/lend-system/read-model"
import {
  buildBorrowBalanceMetrics,
  buildLendDashboardMetrics,
  buildMultiplyBalanceMetrics,
} from "@/app/dashboard/dashboard-tab-metrics"
import { sumWalletValueUsd } from "@/app/dashboard/dashboard-wallet-tab"
import {
  blendEquityWeightedNetApyPct,
  resolveDashboardNetApyPct,
} from "@/app/dashboard/portfolio-headline-metrics"

export type DashboardPortfolioSummary = {
  /** Net Portfolio Value (Assets − Debt), aggregated across products. Umbrella excluded. */
  netValueUsd: number
  /** Value-weighted blended Net APY. Umbrella excluded. */
  netApyPct: number
  /** Unallocated wallet funds only (same scope as the Wallet tab). */
  walletBalanceUsd: number
}

/**
 * Global Net Value = the signed sum of the wallet's canonical product balances
 * (walletLiquid + lend + borrow + multiply buckets), with debt rows negative.
 * Non-LP tokens are valued off the live oracle (`priceFor`); LP rows carry the
 * live-repriced basis productBalances now returns (convex/wallet/productBalances.ts
 * reprices collateral LP at the pool's live price). Umbrella is NEVER part of
 * productBalances, so it is excluded by construction — Umbrella lives on its own page.
 *
 * Reconciliation, precisely: the Wallet card + Wallet tab read this exact
 * `productBalances` source. The Lend / Borrow / Multiply tabs compute their own net
 * figures from the client session read-models (credit-engine / multiply / lend state)
 * — which are HYDRATED from this same productBalances query (see
 * ConvexAvanaSessionsProvider), so they share an origin but re-derive on the client.
 * They should reconcile, but are NOT identical by construction; the aggregation
 * invariant (hero == Σ product nets) is pinned by dashboard-net-value-parity.test.ts.
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
 * Your Dashboard headlines: Wallet Balance (liquid), Net Value (all products),
 * and Net APY (equity-weighted blend of Lend / Borrow / Multiply session metrics).
 */
export function useDashboardPortfolioSummary(walletId: string | undefined): DashboardPortfolioSummary {
  const hasMounted = useHasMounted()
  const balances = useConvexProductWalletBalances(walletId)
  const priceFor = useCanonicalPriceFor()
  const portfolio = useQuery(api.sandbox.transactions.getPortfolio, walletId ? { wallet: walletId } : "skip")
  const borrowSession = useBorrowSessionContext()
  const lendSession = useLendSessionContext()
  const multiplySession = useMultiplySessionContext()

  const walletRows = buildDashboardWalletBalanceRows({
    walletId: walletId ?? "",
    balances: balances ?? undefined,
    priceFor,
  }).filter((row) => row.sourceType === "wallet")
  const walletBalanceUsd = sumWalletValueUsd(walletRows)

  const productNetValueUsd = aggregateNetValueUsd(balances ?? [], priceFor)

  const clientNetApyPct = useMemo(() => {
    if (!hasMounted || !walletId) return null

    const legs: Array<{ equityUsd: number; netApyPct: number }> = []

    try {
      const lendTab = buildPortfolioLendData(walletId, lendSession.state)
      const lendMetrics = buildLendDashboardMetrics(lendTab)
      if (lendMetrics.totalSuppliedUsd > 0) {
        legs.push({ equityUsd: lendMetrics.totalSuppliedUsd, netApyPct: lendMetrics.netApyPct })
      }
    } catch {
      // Session may not be hydrated yet.
    }

    try {
      if (borrowSession.state.accounts[walletId]) {
        const borrow = buildBorrowBalanceMetrics(borrowSession.state, walletId)
        if (borrow.netValueUsd > 0) {
          legs.push({ equityUsd: borrow.netValueUsd, netApyPct: borrow.netApyPct })
        }
      }
    } catch {
      // ignore
    }

    try {
      const multiplyTab = buildPortfolioMultiplyData(walletId, multiplySession.state)
      const multiply = buildMultiplyBalanceMetrics(multiplySession.state, walletId, multiplyTab)
      if (multiply.netValueUsd > 0) {
        legs.push({ equityUsd: multiply.netValueUsd, netApyPct: multiply.netApyPct })
      }
    } catch {
      // ignore
    }

    return blendEquityWeightedNetApyPct(legs)
  }, [borrowSession.state, hasMounted, lendSession.state, multiplySession.state, walletId])

  // Prefer session-derived product equity sum when it exceeds the Convex productBalances
  // rollup — covers the gap where positions exist in session but balances have not yet
  // reflected them (or vice versa: never drop below the Convex aggregate).
  const sessionProductEquityUsd = useMemo(() => {
    if (!hasMounted || !walletId) return null
    let equity = 0
    try {
      const lendTab = buildPortfolioLendData(walletId, lendSession.state)
      equity += Math.max(0, buildLendDashboardMetrics(lendTab).totalSuppliedUsd)
    } catch {
      /* empty */
    }
    try {
      if (borrowSession.state.accounts[walletId]) {
        equity += buildBorrowBalanceMetrics(borrowSession.state, walletId).netValueUsd
      }
    } catch {
      /* empty */
    }
    try {
      const multiplyTab = buildPortfolioMultiplyData(walletId, multiplySession.state)
      equity += buildMultiplyBalanceMetrics(multiplySession.state, walletId, multiplyTab).netValueUsd
    } catch {
      /* empty */
    }
    return equity
  }, [borrowSession.state, hasMounted, lendSession.state, multiplySession.state, walletId])

  const netValueUsd =
    sessionProductEquityUsd != null
      ? Math.max(productNetValueUsd, walletBalanceUsd + sessionProductEquityUsd)
      : productNetValueUsd

  return {
    walletBalanceUsd,
    netValueUsd,
    netApyPct: resolveDashboardNetApyPct(clientNetApyPct, portfolio?.netApyPct),
  }
}
