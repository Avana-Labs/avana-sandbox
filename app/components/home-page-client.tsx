"use client"

import dynamic from "next/dynamic"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

const HOME_WORKSPACE_WALLET_ID = "home-demo-wallet"

// Keep the session/workspace graph (and Convex client runtime via rewards) out of the
// guest `/` entry. Guests never mount this (SandboxGate omits children); signed-in SSR
// still resolves the chunk so returning wallets get real product HTML.
const HomePageWorkspaceRuntime = dynamic(() =>
  import("@/app/components/home-page-workspace-runtime").then((mod) => ({
    default: mod.HomePageWorkspaceRuntime,
  })),
)

export function HomePageClient() {
  const { isSignedIn } = useSiweAuth()
  // When signed in, the Express card reads the app-wide authed session (from the
  // layout providers) so it pre-loads the user's real pools — the same source the
  // dashboard uses. The signed-out public landing / CI render falls back to an
  // isolated demo wallet so the card still has something to show.
  if (isSignedIn) {
    return <HomePageWorkspaceRuntime />
  }
  return <HomePageWorkspaceRuntime walletId={HOME_WORKSPACE_WALLET_ID} />
}
