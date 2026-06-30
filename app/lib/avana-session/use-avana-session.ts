"use client"

import { useMemo } from "react"
import { buildBorrowSessionSeed } from "@/app/lib/borrow-system/demo-session"
import { resolveWalletIdentity } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import { buildLendSessionSeed } from "@/app/lib/lend-system/demo-session"
import { buildMultiplySessionSeed } from "@/app/lib/multiply-system/demo-session"
import { buildRewardsSessionSeed } from "@/app/lib/rewards-system"

export type AvanaSession = {
  walletId: string
  walletAddress: string
  sandboxMode: true
  borrowSessionSeed: string
  multiplySessionSeed: string
  lendSessionSeed: string
  rewardsSessionSeed: string
}

/**
 * Build the per-wallet sandbox session. `walletId` is the built-in demo profile id by
 * default; when the user signs in with SIWE, AvanaSessionProviders passes the authed
 * wallet ADDRESS here (resolveWalletIdentity uses it directly), so every product hook,
 * seed, and Convex read is scoped to the real connected+signed wallet.
 */
export function useAvanaSession(walletId?: string): AvanaSession {
  const profile = useMemo(() => resolveWalletIdentity(walletId), [walletId])

  return useMemo(
    () => ({
      walletId: profile.id,
      walletAddress: profile.walletAddress,
      sandboxMode: true as const,
      borrowSessionSeed: buildBorrowSessionSeed(profile.id),
      multiplySessionSeed: buildMultiplySessionSeed(profile.id),
      lendSessionSeed: buildLendSessionSeed(profile.id),
      rewardsSessionSeed: buildRewardsSessionSeed(),
    }),
    [profile.id, profile.walletAddress],
  )
}
