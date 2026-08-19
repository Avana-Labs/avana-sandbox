"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export type DashboardPortfolioSummary = {
  /** Net Portfolio Value (Assets − Debt), server-computed by appendPortfolioSnapshot. */
  netValueUsd: number
  /** Value-weighted blended Net APY, computed read-time by getPortfolio. */
  netApyPct: number
}

/**
 * The two Convex-sourced "Your Dashboard" figures — Net Value and Net APY —
 * read from the same getPortfolio query the hero chart uses. Kept as its own
 * hook (rather than an inline useQuery) so it mirrors the other dashboard data
 * hooks and can be mocked in component tests that don't mount a ConvexProvider.
 */
export function useDashboardPortfolioSummary(walletId: string | undefined): DashboardPortfolioSummary {
  const portfolio = useQuery(api.sandbox.transactions.getPortfolio, walletId ? { wallet: walletId } : "skip")
  return {
    netValueUsd: portfolio?.latest?.totalValueUsd ?? 0,
    netApyPct: portfolio?.netApyPct ?? 0,
  }
}
