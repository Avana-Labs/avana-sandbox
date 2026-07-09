"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { OnboardingFlow, type OnboardingGateState } from "@/app/components/sandbox/onboarding-flow"

/**
 * Drives OnboardingFlow with live subscriptions (rendered only with Convex). This is the
 * in-progress onboarding UI, so it legitimately subscribes to the global economy status
 * (seats-left/open|closed) in addition to the wallet-only state. The split mirrors the gate:
 * the economy subscription is confined to this actively-onboarding surface, not app-wide.
 */
function OnboardingConnected() {
  const router = useRouter()
  const { authedWallet, isSignedIn } = useSiweAuth()
  const wallet = isSignedIn ? authedWallet : null
  const walletState = useQuery(api.sandbox.onboarding.getWalletOnboardingState, wallet ? { wallet } : "skip") as
    | Omit<OnboardingGateState, "economy">
    | undefined
  const isDone = walletState?.onboardingStep === "done"
  // An already-onboarded wallet has no claim to run and doesn't need economy status.
  const economy = useQuery(
    api.sandbox.onboarding.getEconomyStatus,
    !wallet || isDone || walletState === undefined ? "skip" : { wallet },
  ) as OnboardingGateState["economy"] | undefined

  // An already-onboarded wallet must never see the onboarding flow again — send it
  // straight into the app instead of a "you're already done" screen that reads as a
  // re-entry into onboarding.
  useEffect(() => {
    if (wallet && isDone) router.replace("/dashboard")
  }, [wallet, isDone, router])
  if (wallet && isDone) return null

  const state: OnboardingGateState | null =
    walletState && economy ? { ...walletState, economy } : null
  return <OnboardingFlow wallet={wallet} state={state} />
}

export function OnboardingPageClient() {
  const { t } = useTranslation()
  return (
    <main className="min-h-[calc(100vh-4rem)] px-5 py-6 sm:px-8">
      {hasConvexClient ? (
        <OnboardingConnected />
      ) : (
        <div className="mx-auto w-full max-w-md rounded-radius-lg border border-border bg-surface p-7 text-center text-[14px] text-muted-foreground">
          {t("Sandbox onboarding requires a Convex connection. Set")} <code>NEXT_PUBLIC_CONVEX_URL</code> {t("to continue.")}
        </div>
      )}
    </main>
  )
}
