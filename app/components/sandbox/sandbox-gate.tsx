"use client"

import { Component, type ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { HeaderLocked } from "./header-locked"
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
      <HeaderLocked />
      <main className="flex flex-1 items-center justify-center px-5 py-12">{children}</main>
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

/**
 * The public unauthenticated experience is an explicit demo bypass. Signed-in users
 * remain locked until Convex confirms that onboarding is complete.
 */
export function SandboxGate({ children }: { children: ReactNode }) {
  const { authedWallet, isSignedIn } = useSiweAuth()
  if (!isSignedIn || !authedWallet) return <>{children}</>
  if (!hasConvexClient) return <GateUnavailable />
  return (
    <GateErrorBoundary key={authedWallet}>
      <AuthedGate wallet={authedWallet}>{children}</AuthedGate>
    </GateErrorBoundary>
  )
}
