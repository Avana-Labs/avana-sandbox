"use client"

import { Component, useEffect, useState, type ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Header } from "@/app/components/header"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { IS_OPEN_GATE_TEST_MODE } from "@/app/lib/test-mode"
import { OnboardingFlow, OnboardingUnavailable, type OnboardingGateState } from "./onboarding-flow"

class GateErrorBoundary extends Component<{ children: ReactNode }, { errored: boolean }> {
  state = { errored: false }
  static getDerivedStateFromError() {
    return { errored: true }
  }
  render() {
    return this.state.errored ? <GateUnavailable variant="error" /> : <>{this.props.children}</>
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

function GateUnavailable({ variant = "error" }: { variant?: "error" | "offline" }) {
  // A crash inside the gated app is OUR bug, not an auth problem — don't tell the
  // user to "reconnect their wallet" for a render error. Only the genuine
  // Convex-unreachable case talks about connectivity.
  const copy =
    variant === "offline"
      ? {
          headlineMuted: "We can't reach the sandbox right now.",
          headlineActive: "Please try again in a moment.",
          note: "Your session is safe — this is a temporary connection issue, not your wallet.",
        }
      : {
          headlineMuted: "Something went wrong.",
          headlineActive: "We couldn't load this page.",
          note: "This is on our side, not your wallet. Try again, and let us know if it keeps happening.",
        }
  return (
    <LockedShell>
      <OnboardingUnavailable onRetry={() => window.location.reload()} {...copy} />
    </LockedShell>
  )
}

function AuthedGate({ wallet, children }: { wallet: string; children: ReactNode }) {
  const state = useQuery(api.sandbox.onboarding.getState, { wallet }) as OnboardingGateState | undefined
  // When Convex is configured but unreachable the query never resolves, leaving a
  // forever "Verifying…" spinner. Time out into the offline state after 12s.
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (state !== undefined) {
      setTimedOut(false)
      return
    }
    const timer = setTimeout(() => setTimedOut(true), 12000)
    return () => clearTimeout(timer)
  }, [state])
  if (state === undefined) {
    if (timedOut) return <GateUnavailable variant="offline" />
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
  const { authedWallet, isSignedIn, isRestoring } = useSiweAuth()
  if (IS_OPEN_GATE_TEST_MODE) return <>{children}</>
  if (!hasConvexClient) return <GateUnavailable variant="offline" />
  if (isRestoring) {
    // A persisted session is being restored (wagmi reconnecting on reload). Hold a
    // neutral loading state so authed users don't flash the signed-out/onboarding screen.
    return (
      <LockedShell>
        <div className="h-2 w-40 animate-pulse rounded-full bg-muted" aria-label="Restoring your session" />
      </LockedShell>
    )
  }
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
