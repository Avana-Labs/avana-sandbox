"use client"

import { Component, type ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Header } from "@/app/components/header"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { OnboardingFlow, OnboardingUnavailable, type OnboardingGateState } from "./onboarding-flow"

class GateErrorBoundary extends Component<{ children: ReactNode }, { errored: boolean }> {
  state = { errored: false }
  static getDerivedStateFromError() {
    return { errored: true }
  }
  render() {
    return this.state.errored ? <GateUnavailable /> : <>{this.props.children}</>
  }
}

function LockedShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 px-5 py-6 sm:px-8">{children}</main>
    </div>
  )
}

function GateUnavailable() {
  return (
    <LockedShell>
      <OnboardingUnavailable onRetry={() => window.location.reload()} />
    </LockedShell>
  )
}

function AuthedGate({ wallet, children }: { wallet: string; children: ReactNode }) {
  const state = useQuery(api.sandbox.onboarding.getState, { wallet }) as OnboardingGateState | undefined
  if (state === undefined) {
    return (
      <LockedShell>
        <div className="h-2 w-40 animate-pulse rounded-full bg-muted" aria-label="Verifying onboarding access" />
      </LockedShell>
    )
  }
  if (state.onboardingStep === "done") return <>{children}</>
  return (
    <LockedShell>
      <OnboardingFlow wallet={wallet} state={state} />
    </LockedShell>
  )
}

/** Every wallet stays inside the gate until Convex confirms completed onboarding. */
export function SandboxGate({ children }: { children: ReactNode }) {
  const { authedWallet, isSignedIn } = useSiweAuth()
  if (!hasConvexClient) return <GateUnavailable />
  if (!isSignedIn || !authedWallet) {
    return (
      <LockedShell>
        <OnboardingFlow wallet={null} state={null} />
      </LockedShell>
    )
  }
  return (
    <GateErrorBoundary key={authedWallet}>
      <AuthedGate wallet={authedWallet}>{children}</AuthedGate>
    </GateErrorBoundary>
  )
}
