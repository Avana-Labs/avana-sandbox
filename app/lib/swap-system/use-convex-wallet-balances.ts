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

// Cast until `npx convex dev` regenerates api.d.ts with the new wallet.balances module.
// After codegen this line becomes `api.wallet.balances.listBalances`.
const listBalancesRef = (api as unknown as { wallet: { balances: { listBalances: unknown } } }).wallet.balances
  .listBalances

export function useConvexWalletBalances(walletId: string | null | undefined): UserAssetBalance[] | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const balances = useQuery(listBalancesRef as any, walletId ? { wallet: walletId } : "skip")
  if (!balances) return balances === undefined ? undefined : []
  return balances as UserAssetBalance[]
}
