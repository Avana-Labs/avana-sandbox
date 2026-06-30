"use client"

import { Component, type ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Header } from "@/app/components/header"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { OnboardingFlow, type OnboardingGateState } from "./onboarding-flow"

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
      <div className="w-full max-w-lg space-y-4 text-left">
        <p className="text-sm text-muted-foreground">Avana sandbox access</p>
        <h1 className="text-3xl font-medium tracking-tight">We couldn&apos;t verify your onboarding status.</h1>
        <p className="text-muted-foreground">
          Reconnect your wallet and try again. Authenticated sessions stay locked until Convex confirms access.
        </p>
        <button
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
          onClick={() => window.location.reload()}
          type="button"
        >
          Retry
        </button>
      </div>
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
  // E2E/test harness: it can't perform a real wallet signature and CI has no Convex
  // backend to verify a session, so render the app directly (the onboarding gate is a
  // production-only experience). NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE is never set in prod.
  // The /onboarding route still renders the flow on its own for explicit onboarding tests.
  if (process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === "1") return <>{children}</>
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
