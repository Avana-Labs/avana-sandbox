"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import {
  OnboardingComplete,
  OnboardingFlow,
  type OnboardingGateState,
} from "@/app/components/sandbox/onboarding-flow"

/** Drives OnboardingFlow with a live getState subscription (rendered only with Convex). */
function OnboardingConnected() {
  const { authedWallet, isSignedIn } = useSiweAuth()
  const wallet = isSignedIn ? authedWallet : null
  const state = useQuery(api.sandbox.onboarding.getState, wallet ? { wallet } : "skip") as
    | OnboardingGateState
    | undefined
  // An already-onboarded wallet has no claim to run: show the persistent completed state
  // instead of the re-runnable welcome/claim flow (issue #140).
  if (wallet && state?.onboardingStep === "done") return <OnboardingComplete />
  return <OnboardingFlow wallet={wallet} state={state ?? null} />
}

export function OnboardingPageClient() {
  return (
    <main className="min-h-[calc(100vh-4rem)] px-5 py-6 sm:px-8">
      {hasConvexClient ? (
        <OnboardingConnected />
      ) : (
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center text-[14px] text-muted-foreground">
          Sandbox onboarding requires a Convex connection. Set <code>NEXT_PUBLIC_CONVEX_URL</code> to continue.
        </div>
      )}
    </main>
  )
}
