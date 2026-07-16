"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { OnboardingFlow, type OnboardingGateState } from "@/app/components/sandbox/onboarding-flow"

export function OnboardingPageConnected({ wallet }: { wallet: string }) {
  const router = useRouter()
  const walletState = useQuery(api.sandbox.onboarding.getWalletOnboardingState, { wallet }) as
    Omit<OnboardingGateState, "economy"> | undefined
  const isDone = walletState?.onboardingStep === "done"
  const economy = useQuery(
    api.sandbox.onboarding.getEconomyStatus,
    isDone || walletState === undefined ? "skip" : { wallet },
  ) as OnboardingGateState["economy"] | undefined

  useEffect(() => {
    if (isDone) router.replace("/portfolio")
  }, [isDone, router])
  if (isDone) return null

  const state: OnboardingGateState | null = walletState && economy ? { ...walletState, economy } : null
  return <OnboardingFlow wallet={wallet} state={state} />
}
