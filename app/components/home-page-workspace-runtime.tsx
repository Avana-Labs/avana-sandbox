"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import type { HomeMode } from "@/app/lib/home-sim"
import { HomeWorkspaceCard } from "@/app/components/home/home-workspace-card"
import { HomeSwapAction } from "@/app/components/home/home-swap-action"
import { ActionSessionLoading } from "@/app/components/action-page/action-session-loading"
import { HomeWorkspaceSkeleton } from "@/app/components/loading-states"
import {
  AvanaSessionsProvider,
  useBorrowSessionContext,
  useRewardsSessionContext,
} from "@/app/lib/avana-session/avana-sessions-provider"

// Swap is the initial mode. Fetch the other action forms only when selected,
// keeping their configuration/picker graph off the initial workspace load.
const BorrowActionPageClient = dynamic(
  () => import("@/app/components/action-page/borrow-action-page-client").then((mod) => mod.BorrowActionPageClient),
  { loading: ActionSessionLoading },
)

export function HomePageWorkspaceRuntime({ walletId }: { walletId?: string }) {
  if (walletId) {
    return (
      <AvanaSessionsProvider walletId={walletId}>
        <HomePageWorkspace />
      </AvanaSessionsProvider>
    )
  }

  return <HomePageWorkspace />
}

function HomePageWorkspace() {
  const session = useBorrowSessionContext()
  const { applyReferralCode, hasHydratedStorage } = useRewardsSessionContext()
  const [mode, setMode] = useState<HomeMode>("swap")

  // Referral links now land here (https://avana.cc/?ref=<code>). Capture the code the
  // same way the dashboard does — read it from the URL once storage has hydrated and
  // record the referrer on this session. Fail-open: an invalid/self code is ignored.
  useEffect(() => {
    if (!hasHydratedStorage || typeof window === "undefined") return
    const ref = new URLSearchParams(window.location.search).get("ref")
    if (!ref) return
    void applyReferralCode(ref).catch(() => undefined)
  }, [applyReferralCode, hasHydratedStorage])

  // Gate on the full available-pool list (always populated) rather than the
  // pledged pools — a freshly onboarded wallet with no positions still renders
  // the card instead of hanging on the loading skeleton forever.
  if (session.availableCollateralPools.length === 0) {
    return <HomeWorkspaceSkeleton />
  }

  return (
    <div className="bg-background">
      <HomeWorkspaceCard mode={mode} onModeChange={setMode}>
        {mode === "borrow" ? <BorrowActionPageClient kind="borrow" embedded layout="home" closeHref="/" /> : null}
        {mode === "swap" ? <HomeSwapAction /> : null}
        {mode === "repay" ? <BorrowActionPageClient kind="repay" embedded layout="home" closeHref="/" /> : null}
        {mode === "claim" ? <BorrowActionPageClient kind="claim" embedded layout="home" closeHref="/" /> : null}
        {mode === "remove" ? <BorrowActionPageClient kind="remove" embedded layout="home" closeHref="/" /> : null}
      </HomeWorkspaceCard>
    </div>
  )
}
