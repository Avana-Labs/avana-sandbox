"use client"

import { Component, useEffect, useState, type ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Header } from "@/app/components/header"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { useWalletGate } from "@/app/lib/web3/wallet-gate"
import { IS_DEV_SHORTCUT_MODE } from "@/app/lib/test-mode"
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

/** Wallet-only state (no economy) shaped for OnboardingFlow. */
type WalletOnlyState = Omit<OnboardingGateState, "economy">

function AuthedGate({ wallet, children }: { wallet: string; children: ReactNode }) {
  // Steady-state subscription: wallet profile/step ONLY. This does NOT read the global
  // economy shard counters, so a claim by any other wallet no longer invalidates every
  // authed wallet's gate subscription (the 10k-concurrency hazard). The economy status is
  // subscribed separately, and only while onboarding is still in progress (below).
  const walletState = useQuery(api.sandbox.onboarding.getWalletOnboardingState, { wallet }) as
    | WalletOnlyState
    | undefined
  const isDone = walletState?.onboardingStep === "done"
  // Only pull the (invalidated-by-every-claim) economy status when this wallet is NOT done —
  // i.e. it is actively onboarding and the OnboardingFlow needs seats-left/open|closed.
  const economy = useQuery(
    api.sandbox.onboarding.getEconomyStatus,
    isDone || walletState === undefined ? "skip" : { wallet },
  ) as OnboardingGateState["economy"] | undefined

  // When Convex is configured but unreachable the query never resolves, leaving a
  // forever "Verifying…" spinner. Time out into the offline state after 12s.
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
    if (timedOut) return <GateUnavailable variant="offline" />
    return (
      <LockedShell>
        <div className="h-2 w-40 animate-pulse rounded-full bg-muted" aria-label="Verifying onboarding access" />
      </LockedShell>
    )
  }
  if (isDone) return <>{children}</>
  // Onboarding still in progress: wait for the economy status before rendering the flow so
  // seats-left/closed copy is accurate rather than flashing a default.
  if (economy === undefined) {
    return (
      <LockedShell>
        <div className="h-2 w-40 animate-pulse rounded-full bg-muted" aria-label="Verifying onboarding access" />
      </LockedShell>
    )
  }
  return (
    <LockedShell>
      <OnboardingFlow wallet={wallet} state={{ ...walletState, economy }} />
    </LockedShell>
  )
}

/** Every wallet stays inside the gate until Convex confirms completed onboarding. */
export function SandboxGate({ children }: { children: ReactNode }) {
  const { authedWallet, isSignedIn } = useSiweAuth()
  const { active: walletActive } = useWalletGate()
  if (IS_DEV_SHORTCUT_MODE) return <>{children}</>
  if (!hasConvexClient) return <GateUnavailable variant="offline" />
  // Signed-in from the persisted token, but the wallet SDK is still mounting (its chunk is
  // deferred off the critical path). Hold a neutral loading state: rendering the authed app
  // now would let action pages call wagmi hooks before the provider exists. This window is
  // brief and only affects returning users — guests never mount the SDK here.
  if (isSignedIn && !walletActive) {
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
