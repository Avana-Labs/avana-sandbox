"use client"

import { Component, type ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { HeaderLocked } from "./header-locked"
import { OnboardingFlow, type OnboardingGateState } from "./onboarding-flow"

/** Fail-open boundary: an auth/Convex error in the gate must never brick the app. */
class GateErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { errored: boolean }> {
  state = { errored: false }
  static getDerivedStateFromError() {
    return { errored: true }
  }
  componentDidCatch() {
    /* swallow — render the fallback (the app) instead of crashing */
  }
  render() {
    return this.state.errored ? <>{this.props.fallback}</> : <>{this.props.children}</>
  }
}

function LockedShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <HeaderLocked />
      <main className="flex flex-1 items-center justify-center px-5 py-12">{children}</main>
    </div>
  )
}

function AuthedGate({ wallet, children }: { wallet: string; children: ReactNode }) {
  const state = useQuery(api.sandbox.onboarding.getState, { wallet }) as OnboardingGateState | undefined
  // While loading, render the app (don't flash the lock). Once onboarding is done the
  // app stays unlocked; any other step replaces the chrome with the locked shell.
  if (state === undefined || state.onboardingStep === "done") return <>{children}</>
  return (
    <LockedShell>
      <OnboardingFlow wallet={wallet} state={state} />
    </LockedShell>
  )
}

/**
 * Gates the authenticated app behind onboarding. Fail-open by construction: the public,
 * unauthenticated demo — and any state where Convex is unavailable or a query errors —
 * renders children unchanged. ONLY a signed-in wallet that has not finished onboarding
 * sees the locked shell + onboarding flow.
 */
export function SandboxGate({ children }: { children: ReactNode }) {
  const { authedWallet, isSignedIn } = useSiweAuth()
  if (!isSignedIn || !authedWallet || !hasConvexClient) return <>{children}</>
  return (
    <GateErrorBoundary fallback={children}>
      <AuthedGate wallet={authedWallet}>{children}</AuthedGate>
    </GateErrorBoundary>
  )
}
