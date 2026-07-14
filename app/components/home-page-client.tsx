"use client"

import { useState } from "react"
import type { HomeMode } from "@/app/lib/home-sim"
import { BorrowActionPageClient } from "@/app/components/action-page/borrow-action-page-client"
import { HomeWorkspaceCard } from "@/app/components/home/home-workspace-card"
import { HomeWorkspaceSkeleton } from "@/app/components/loading-states"
import { AvanaSessionsProvider, useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

const HOME_WORKSPACE_WALLET_ID = "home-demo-wallet"

export function HomePageClient() {
  const { isSignedIn } = useSiweAuth()
  // When signed in, the Express card reads the app-wide authed session (from the
  // layout providers) so it pre-loads the user's real pools — the same source the
  // dashboard uses. The signed-out public landing / CI render falls back to an
  // isolated demo wallet so the card still has something to show.
  if (isSignedIn) {
    return <HomePageWorkspace />
  }
  return (
    <AvanaSessionsProvider walletId={HOME_WORKSPACE_WALLET_ID}>
      <HomePageWorkspace />
    </AvanaSessionsProvider>
  )
}

function HomePageWorkspace() {
  const { borrow: session } = useAvanaSessions()
  const [mode, setMode] = useState<HomeMode>("borrow")

  // Gate on the full available-pool list (always populated) rather than the
  // pledged pools — a freshly onboarded wallet with no positions still renders
  // the card instead of hanging on the loading skeleton forever.
  if (session.availableCollateralPools.length === 0) {
    return <HomeWorkspaceSkeleton />
  }

  return (
    <div className="reveal-in bg-background">
      <HomeWorkspaceCard mode={mode} onModeChange={setMode}>
        {mode === "borrow" ? (
          <BorrowActionPageClient kind="borrow" embedded layout="home" closeHref="/" />
        ) : null}
        {mode === "repay" ? (
          <BorrowActionPageClient kind="repay" embedded layout="home" closeHref="/" />
        ) : null}
        {mode === "claim" ? (
          <BorrowActionPageClient kind="claim" embedded layout="home" closeHref="/" />
        ) : null}
        {mode === "remove" ? (
          <BorrowActionPageClient kind="remove" embedded layout="home" closeHref="/" />
        ) : null}
      </HomeWorkspaceCard>
    </div>
  )
}
