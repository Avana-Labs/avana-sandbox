"use client"

/**
 * Convex-backed replacement for DEMO_SWAP_BALANCES. Any component currently
 * consuming UserAssetBalance[] via getUserSwapBalances(walletId) can migrate to
 * this hook — the shape matches app/lib/swap-system/contracts.ts UserAssetBalance
 * exactly. Returns undefined while the query is loading (Convex convention);
 * returns [] when authenticated but no balances yet (fresh dev wallet).
 *
 * Wallet-scoped + gated on the authed identity (Convex requireSandboxWallet),
 * so this cannot leak another wallet's holdings.
 */

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { UserAssetBalance } from "./contracts"

export function useConvexWalletBalances(walletId: string | null | undefined): UserAssetBalance[] | undefined {
  const balances = useQuery(api.wallet.balances.listBalances, walletId ? { wallet: walletId } : "skip")
  if (!balances) return balances === undefined ? undefined : []
  return balances.map((row) => ({
    id: row.id,
    walletId: row.walletId,
    assetId: row.assetId,
    amount: row.amount,
    sourceType: "wallet" as const,
    sourcePositionId: row.sourcePositionId ? String(row.sourcePositionId) : undefined,
  }))
}

export function useConvexProductWalletBalances(walletId: string | null | undefined): UserAssetBalance[] | undefined {
  const buckets = useQuery(api.wallet.productBalances.listForWallet, walletId ? { wallet: walletId } : "skip")
  if (!buckets) return buckets === undefined ? undefined : []
  const resolvedWalletId = walletId ?? ""

  const rows: UserAssetBalance[] = []
  for (const row of buckets.liquid) {
    rows.push({
      id: String(row._id),
      walletId: resolvedWalletId,
      assetId: row.assetId,
      amount: row.amount,
      valueUsd: row.valueUsd,
      sourceType: "wallet",
    })
  }
  for (const row of buckets.lend) {
    rows.push({
      id: String(row._id),
      walletId: resolvedWalletId,
      assetId: row.assetId,
      amount: row.amount,
      valueUsd: row.valueUsd,
      sourceType: row.state === "available" ? "wallet" : "lend_deposited",
    })
  }
  for (const row of buckets.borrow) {
    rows.push({
      id: String(row._id),
      walletId: resolvedWalletId,
      assetId: row.poolId ?? row.assetId ?? row.marketId ?? row.symbol.toLowerCase(),
      amount: row.amount,
      valueUsd: row.valueUsd,
      sourceType:
        row.state === "poolAvailable"
          ? "borrow_collateral_unpledged"
          : row.state === "collateral"
            ? "borrow_collateral_pledged"
            : "protocol_locked",
    })
  }
  for (const row of buckets.multiply) {
    rows.push({
      id: String(row._id),
      walletId: resolvedWalletId,
      assetId: row.assetId,
      amount: row.amount,
      valueUsd: row.valueUsd,
      sourceType: row.state === "available" ? "multiply_available" : "multiply_active",
    })
  }
  return rows
}
