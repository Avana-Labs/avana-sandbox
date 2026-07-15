"use client"

import dynamic from "next/dynamic"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { IS_DEV_SHORTCUT_MODE } from "@/app/lib/test-mode"

const ConnectedPreferencesProfileSync = dynamic(
  () => import("./preferences-profile-sync-connected").then((mod) => mod.PreferencesProfileSyncConnected),
  { ssr: false },
)

export function PreferencesProfileSync() {
  const { authedWallet, isSignedIn } = useSiweAuth()
  if (!hasConvexClient || IS_DEV_SHORTCUT_MODE || !isSignedIn || !authedWallet) return null
  return <ConnectedPreferencesProfileSync wallet={authedWallet} />
}
