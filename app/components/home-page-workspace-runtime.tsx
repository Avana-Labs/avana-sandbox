"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import type { HomeMode } from "@/app/lib/home-sim"
import { HomeWorkspaceCard } from "@/app/components/home/home-workspace-card"
import { HomeSwapAction } from "@/app/components/home/home-swap-action"
import { HomeWorkspaceSkeleton } from "@/app/components/loading-states"
import { AvanaSessionsProvider, useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"

const BorrowActionPageClient = dynamic(
  () => import("@/app/components/action-page/borrow-action-page-client").then((mod) => mod.BorrowActionPageClient),
  {
    ssr: false,
    loading: () => <HomeWorkspaceSkeleton />,
  },
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
  const [mode, setMode] = useState<HomeMode>("swap")

  // Gate on the full available-pool list (always populated) rather than the
  // pledged pools — a freshly onboarded wallet with no positions still renders
  // the card instead of hanging on the loading skeleton forever.
  if (session.availableCollateralPools.length === 0) {
    return <HomeWorkspaceSkeleton />
  }

  return (
    <div className="reveal-in bg-background">
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
