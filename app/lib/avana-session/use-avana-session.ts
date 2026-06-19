"use client"

import { useMemo } from "react"
import { buildBorrowSessionSeed } from "@/app/lib/borrow-system/demo-session"
import { getDefaultWalletProfileId, getWalletProfile } from "@/app/lib/data/mock/wallet/portfolio/profiles"
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

export function useAvanaSession(walletId = getDefaultWalletProfileId()): AvanaSession {
  const profile = useMemo(() => getWalletProfile(walletId), [walletId])

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
