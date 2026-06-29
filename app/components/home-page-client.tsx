"use client"

import { useEffect, useState } from "react"
import type { HomeMode } from "@/app/lib/home-sim"
import { BorrowActionPageClient } from "@/app/components/action-page/borrow-action-page-client"
import { HomeWorkspaceCard } from "@/app/components/home/home-workspace-card"
import { AvanaSessionsProvider, useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"

const HOME_WORKSPACE_WALLET_ID = "home-demo-wallet"

export function HomePageClient() {
  return (
    <AvanaSessionsProvider walletId={HOME_WORKSPACE_WALLET_ID}>
      <HomePageWorkspace />
    </AvanaSessionsProvider>
  )
}

function HomePageWorkspace() {
  const { borrow: session } = useAvanaSessions()
  const [isClientReady, setIsClientReady] = useState(false)
  const [mode, setMode] = useState<HomeMode>("borrow")

  useEffect(() => {
    setIsClientReady(true)
  }, [])

  if (!isClientReady || session.collateralPools.length === 0) {
    return (
      <div className="bg-background">
        <section className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8">
          <div className="h-[360px] w-full max-w-[480px] animate-pulse rounded-[20px] bg-muted/40" data-testid="home-workspace-loading" />
        </section>
      </div>
    )
  }

  return (
    <div className="bg-background">
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
