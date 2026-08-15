"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Header } from "@/app/components/header"
import { OnboardingCardSkeleton } from "@/app/components/loading-states"
import { OnboardingFlow, OnboardingUnavailable, type OnboardingGateState } from "./onboarding-flow"

type WalletOnlyState = Omit<OnboardingGateState, "economy">

function LockedShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 px-5 py-6 sm:px-8">{children}</main>
    </div>
  )
}

function OfflineGate() {
  return (
    <LockedShell>
      <OnboardingUnavailable
        onRetry={() => window.location.reload()}
        headlineMuted="We can't reach the sandbox right now."
        headlineActive="Please try again in a moment."
        note="Your session is safe. This is a temporary connection issue, not your wallet."
      />
    </LockedShell>
  )
}

export function AuthedSandboxGate({ wallet, children }: { wallet: string; children: ReactNode }) {
  const walletState = useQuery(api.sandbox.onboarding.getWalletOnboardingState, { wallet }) as
    WalletOnlyState | undefined
  const isDone = walletState?.onboardingStep === "done"
  const economy = useQuery(
    api.sandbox.onboarding.getEconomyStatus,
    isDone || walletState === undefined ? "skip" : { wallet },
  ) as OnboardingGateState["economy"] | undefined
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (walletState !== undefined) {
      setTimedOut(false)
      return
    }
    const timer = setTimeout(() => setTimedOut(true), 12000)
    return () => clearTimeout(timer)
  }, [walletState])

  if (walletState === undefined) {
    if (timedOut) return <OfflineGate />
    return (
      <LockedShell>
        <OnboardingCardSkeleton />
      </LockedShell>
    )
  }
  if (isDone) return <>{children}</>
  if (economy === undefined) {
    return (
      <LockedShell>
        <OnboardingCardSkeleton />
      </LockedShell>
    )
  }
  return (
    <LockedShell>
      <OnboardingFlow wallet={wallet} state={{ ...walletState, economy }} />
    </LockedShell>
  )
}
